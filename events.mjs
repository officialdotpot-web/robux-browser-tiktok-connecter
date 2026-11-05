// Unofficial TikTok LIVE event normalization. No credentials are used.
export function senderOf(d) {
 const userId=d?.user?.userId || d?.user?.id;
 if ((typeof userId==='string'||typeof userId==='number'||typeof userId==='bigint') && String(userId) && String(userId)!=='0') return 'id:'+String(userId);
 const candidates=[d?.user?.uniqueId,d?.user?.unique_id,d?.user?.displayId,d?.uniqueId];
 for(const c of candidates) if(typeof c==='string' && /^[\w.]{1,80}$/.test(c)) return c.toLowerCase();
 return '';
}
// For display only. Matching still uses the stable sender id from senderOf.
export function senderDisplayOf(d) {
 const user=d?.user||{};
 for(const value of [user.uniqueId,user.unique_id,user.displayId,d?.uniqueId]) {
  if(typeof value==='string' && /^[A-Za-z0-9._]{1,80}$/.test(value)) return '@'+value;
 }
 const nickname=typeof user.nickname==='string'?user.nickname.trim().replace(/\s+/g,' ').slice(0,40):'';
 return nickname||'';
}
export function normalizeChat(d) {
 const text=typeof d?.content==='string'?d.content:d?.comment;
 if(typeof text!=='string')return null;
 return {comment:text.slice(0,300),sender:senderOf(d),senderDisplay:senderDisplayOf(d)};
}
const known=new Map([['rose',5000],['doughnut',45000],['boxing gloves',100000],['coral',200000],['galaxy',500000],['future encounter',1000000]]);
export function createGiftNormalizer(){
 const streaks=new Map(), seen=new Set();
 return function(d){
  const sender=senderOf(d), details=d?.giftDetails||{}, gift=d?.gift||{}, extended=d?.extendedGiftInfo||{};
  const names=[details.giftName,details.name,gift.giftName,gift.name,d?.giftName,extended.name,extended.giftName];
  let name=String(names.find(v=>typeof v==='string'&&v.trim())||'').trim().replace(/\s+/g,' ');
  if(!sender)return null;
  const prices=[details.diamondCount,details.diamond_count,gift.diamondCount,gift.diamond_count,extended.diamondCount,extended.diamond_count,d?.diamondCount];
  const rawPrice=prices.find(v=>v!=null&&Number.isFinite(Number(v))&&Number(v)>0);
  // Preserve the existing one-coin rule when price is reported but no name.
  // Otherwise do not guess whether a nameless event is a special gift.
  if(!name){if(rawPrice!=null&&Number(rawPrice)===1)name='1-coin gift';else return null}
  const isMoneyGun=name.toLowerCase()==='money gun';
  const amount=isMoneyGun?0:(known.get(name.toLowerCase())||(rawPrice!=null&&Number(rawPrice)===1?5000:0));
  // All named gifts are emitted. Zero-valued unknown gifts are Headless-only;
  // the Robux automation only accepts its existing explicit amounts.
  const giftType=Number(details.giftType??details.type??gift.giftType??gift.type??d?.giftType??((gift.combo||details.combo)?1:0));
  const isStreak=giftType===1||gift.combo===true||details.combo===true||extended.combo===true;
  const repeatEnded=d?.repeatEnd===true||Number(d?.repeatEnd)===1;
  const count=Math.min(1000,Math.max(1,Math.floor(Number(d?.repeatCount)||1)));
  let group=String(d?.groupId||d?.groupID||'');if(group==='0')group='';
  const giftIdentity=String(d?.giftId||gift.id||name);
  const rawMsgId=d?.common?.msgId??d?.common?.msgID??d?.msgId;
  const id=rawMsgId==null?'':String(rawMsgId);
  if(id && id!=='0'&&id!=='[object Object]'){
    const key=isStreak?sender+'|'+giftIdentity+'|'+group+'|'+id+'|'+count+'|'+(repeatEnded?1:0):id;
    if(seen.has(key))return null;seen.add(key);if(seen.size>20000)seen.delete(seen.values().next().value);
  }
  let increment=count,headlessCount=1;
  if(isStreak){
   const key=sender+'|'+giftIdentity+'|'+group;
   const old=streaks.get(key)||{count:0,finished:false,lastId:''};
   increment=Math.max(0,count-old.count);
   // A finished, ungrouped streak can be followed by another separate gift.
   const restart=!group&&count===1&&((old.finished&&((id&&id!=='0'&&id!==old.lastId)||!repeatEnded))||(old.count>1&&id&&id!=='0'&&id!==old.lastId));
   if(restart)increment=1;
   // Headless rewards are one per combo, even when its count grows. The
   // existing Robux count remains the number of individual gifts in that update.
   headlessCount=(old.count===0||restart)?1:0;
   streaks.set(key,{count:restart?1:Math.max(count,old.count),finished:repeatEnded,lastId:id});
   if(streaks.size>10000)streaks.delete(streaks.keys().next().value);
  }
  return increment>0?{sender,senderDisplay:senderDisplayOf(d),name,amount,count:increment,headlessCount}:null;
 }
}
