import express from 'express';
import {TikTokLiveConnection, WebcastEvent} from 'tiktok-live-connector';
import {normalizeChat, createGiftNormalizer} from './events.mjs';
const app=express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Wix's sandbox can give the embedded app an opaque origin. The public demo
// accepts anonymous cross-origin requests and never receives a TikTok password.
app.use('/api', (req,res,next)=>{res.set('Access-Control-Allow-Origin','*');next()});
const activeByIp=new Map(), attempts=new Map(); let activeTotal=0;
// Lightweight status checks use TikTok's room metadata, not a chat WebSocket.
const liveChecks=new Map();
function release(ip){activeTotal=Math.max(0,activeTotal-1);const n=(activeByIp.get(ip)||1)-1;if(n<=0)activeByIp.delete(ip);else activeByIp.set(ip,n)}
function tryAcquire(ip){
  const now=Date.now();let v=attempts.get(ip);if(!v||now-v.start>60000)v={start:now,count:0};
  v.count++;attempts.set(ip,v);
  if(v.count>20||(activeByIp.get(ip)||0)>=3||activeTotal>=20)return false;
  activeByIp.set(ip,(activeByIp.get(ip)||0)+1);activeTotal++;return true;
}
setInterval(()=>{const cutoff=Date.now()-120000;for(const [key,value] of attempts)if(value.start<cutoff)attempts.delete(key);for(const [key,value] of liveChecks)if(Date.now()-value.at>15000)liveChecks.delete(key)},60000).unref();
app.get('/api/health', (req,res)=>res.json({service:'tiktok-live-demo',ok:true}));
// Called by Auto Connect every five seconds. It does not open a LIVE chat
// connection; it only opens SSE once TikTok reports the account is LIVE.
app.get('/api/live-check',async(req,res)=>{
 const name=String(req.query.username||'').replace(/^@/,'').trim();
 if(!/^[A-Za-z0-9._]{2,24}$/.test(name))return res.status(400).json({error:'Invalid TikTok username'});
 const key=name.toLowerCase(),now=Date.now(),cached=liveChecks.get(key);
 if(cached&&now-cached.at<4000){try{return res.json(await cached.promise)}catch{}}
 const promise=(async()=>{const probe=new TikTokLiveConnection(name,{processInitialData:false,webClientOptions:{timeout:{request:10000}}});const isLive=await probe.fetchIsLive();return {username:name,isLive:!!isLive,checkedAt:new Date().toISOString()}})();
 liveChecks.set(key,{at:now,promise});
 try{return res.json(await promise)}catch(error){liveChecks.delete(key);console.error('TikTok LIVE status check failed:',name,error?.message||error);return res.status(502).json({error:'LIVE status check failed; will check again shortly'})}
});
app.get('/api/live',(req,res)=>{
 const name=String(req.query.username||'').replace(/^@/,'').trim();
 if(!/^[A-Za-z0-9._]{2,24}$/.test(name)){return res.status(400).send('Invalid TikTok username');}
 const ip=req.ip||'unknown';
 if(!tryAcquire(ip)){res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache'});return res.end('event: failed\ndata: '+JSON.stringify({message:'Connection limit reached. Close extra app tabs and retry later.'})+'\n\n')}
 let released=false;res.once('close',()=>{if(!released){released=true;release(ip)}});
 res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.flushHeaders();
 let closed=false, conn=new TikTokLiveConnection(name,{processInitialData:false,webClientOptions:{timeout:{request:15000}},wsClientOptions:{handshakeTimeout:15000}});
 const emit=(type,data)=>{if(!closed)res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)};
 emit('status',{message:`Connecting to @${name}…`});
 const normalizeGift=createGiftNormalizer();
 conn.on(WebcastEvent.CHAT,d=>{const chat=normalizeChat(d);if(chat)emit('chat',chat);});
 conn.on(WebcastEvent.GIFT,d=>{const gift=normalizeGift(d);if(gift)emit('gift',gift);});
 conn.on('error',err=>{ const detail=err?.exception?.message||err?.message||err?.info||'Unknown connection error'; console.error('TikTok connection error:',name,detail); emit('status',{message:'Connection error: '+String(detail).slice(0,250)}); });
 conn.on('disconnected',()=>{emit('status',{message:'TikTok LIVE disconnected.'});if(!closed)res.end()});
 const heartbeat=setInterval(()=>{if(!closed)res.write(': keepalive\n\n')},15000);
 res.once('close',()=>{closed=true;clearInterval(heartbeat);Promise.resolve(conn.disconnect()).catch(()=>{});});
 console.log('TikTok connection requested:',name);
 conn.connect().then(()=>{console.log('TikTok connected:',name);if(closed){conn.disconnect().catch(()=>{});return}emit('connected',{message:`Connected to @${name} LIVE`})}).catch(err=>{console.error('TikTok connection failed:',name,err?.message||err);emit('failed',{message:'Could not connect: '+String(err?.message||err).slice(0,250)});res.end()});
});
app.get('/',(req,res)=>res.sendFile('index.html',{root:process.cwd()}));
const port=Number(process.env.PORT)||3000;
app.listen(port,'0.0.0.0',()=>console.log(`Demo listening on port ${port}`));
