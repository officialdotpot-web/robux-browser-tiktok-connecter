// Unofficial TikTok LIVE event normalization. No credentials are used.
export function senderOf(d) {
 // The current v3 schema exposes a stable numeric `id` rather than `uniqueId`.
 const userId=d?.user?.userId || d?.user?.id;
 if ((typeof userId==='string'||typeof userId==='number'||typeof userId==='bigint') && String(userId) && String(userId)!=='0') return 'id:'+String(userId);
 const candidates=[d?.user?.uniqueId,d?.user?.unique_id,d?.user?.displayId,d?.uniqueId];
 for(const c of candidates) if(typeof c==='string' && /^[\w.]{1,80}$/.test(c)) return c.toLowerCase();
 return '';
}
export function normalizeChat(d) {
 // The active v3 protocol uses content; older versions exposed comment.
 const text=typeof d?.content==='string'?d.content:d?.comment;
 if(typeof text!=='string')return null;
 return {comment:text.slice(0,300),sender:senderOf(d)};
}
const known=new Map([['rose',5000],['boxing gloves',100000],['coral',200000],['galaxy',500000],['future encounter',1000000]]);
export function createGiftNormalizer(){
 const streaks=new Map(), seen=new Set();
 return function(d){
  const sender=senderOf(d), details=d?.giftDetails || d?.gift || {};
  const name=String(details.giftName||details.name||d?.giftName||d?.extendedGiftInfo?.name||'').trim().replace(/\s+/g,' ');
  const amount=known.get(name.toLowerCase());
  if(!sender||!amount)return null;
  const rawMsgId=d?.common?.msgId??d?.common?.msgID??d?.msgId;
  const id=rawMsgId==null?'':String(rawMsgId);
  if(id && id!=='0'&&id!=='[object Object]'){if(seen.has(id))return null;seen.add(id);if(seen.size>20000)seen.delete(seen.values().next().value)}
  const giftType=Number(details.giftType??details.type??d?.giftType??0);
  const count=Math.min(1000,Math.max(1,Math.floor(Number(d?.repeatCount)||1)));
  let increment=count;
  if(giftType===1){
   const group=String(d?.groupId||d?.groupID||'');
   const key=sender+'|'+String(d?.giftId||name)+'|'+group;
   const old=streaks.get(key)||{count:0,finished:false};
   increment=Math.max(0,count-old.count);
   streaks.set(key,{count:Math.max(count,old.count),finished:!!d?.repeatEnd});
   if(streaks.size>10000)streaks.delete(streaks.keys().next().value);
   // Without a group ID, the next streak starts on a fresh count of one.
   if(!group && old.finished && !d?.repeatEnd && count===1){increment=1;streaks.set(key,{count:1,finished:false})}
  }
  return increment>0?{sender,name,amount,count:increment}:null;
 }
}
