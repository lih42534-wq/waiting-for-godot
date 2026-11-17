'use strict';
const $=id=>document.getElementById(id);
const ui={show:id=>$(id).hidden=false,hide:id=>$(id).hidden=true};
const canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false});
const W=960,H=540;ctx.imageSmoothingEnabled=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function layoutHotspots(){const bounds=canvas.getBoundingClientRect(),scale=Math.min(bounds.width/W,bounds.height/H),left=(bounds.width-W*scale)/2,top=(bounds.height-H*scale)/2;document.querySelectorAll('.spot').forEach(b=>{const x=parseFloat(b.style.getPropertyValue('--x'))/100,y=parseFloat(b.style.getPropertyValue('--y'))/100;b.style.left=`${left+x*W*scale}px`;b.style.top=`${top+y*H*scale}px`})}
new ResizeObserver(layoutHotspots).observe($('game'));layoutHotspots();
const state={act:0,mode:'title',paused:false,muted:true,visited:new Set(),notes:[],queue:[],index:0,typed:0,lineStarted:0,head:0,headUntil:0,headSince:0,tea:false,choice:'',quietReturn:'explore',quietTime:0,quietDone:false,elapsed:0,frame:0,loaded:false,trainStart:null,passenger:false,passengerStart:0,nightStart:0};
let afterDialogue=null,toastTimer,renderTime=0,lastFrame=0,audio=null,autoExplore=null;
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.opacity=0,2900)}
function note(key,text){if(state.notes.some(n=>n.key===key))return;state.notes.push({key,text,act:state.act});$('noteCount').textContent=state.notes.length;renderNotes();toast('手记里留下了一个片刻')}
function renderNotes(){const root=$('notes');root.replaceChildren();if(!state.notes.length){const p=document.createElement('p');p.textContent='口袋里还空着。先去听听风吧。';root.append(p)}state.notes.forEach(n=>{const a=document.createElement('article'),s=document.createElement('small'),p=document.createElement('p');s.textContent=n.act===1?'第一个黄昏':'第二个黄昏';p.textContent=n.text;a.append(s,p);root.append(a)})}
const line=(speaker,text,head=0)=>({speaker,text,head});
function turn(dir,seconds=3){if(state.head!==dir)state.headSince=state.elapsed;state.head=dir;state.headUntil=state.elapsed+seconds}
function talk(lines,done){state.mode='dialogue';state.queue=lines;state.index=0;afterDialogue=done;clearTimeout(autoExplore);['hotspots','exploreHint','quietPanel'].forEach(ui.hide);ui.show('dialogue');showLine()}
function showLine(){const n=state.queue[state.index];if(n.seat&&!state.passenger){state.passenger=true;state.passengerStart=state.elapsed}state.typed=0;state.lineStarted=state.elapsed;$('speaker').textContent=n.speaker;$('words').textContent='';$('lineCounter').textContent=`${String(state.index+1).padStart(2,'0')} / ${String(state.queue.length).padStart(2,'0')}`;$('choices').replaceChildren();ui.hide('choices');ui.show('nextBtn');turn(n.head||0,Math.max(3,n.text.length*.09));if(n.choices){ui.hide('nextBtn')}}
function next(){if(state.paused||!$('journal').hidden||state.mode!=='dialogue')return;const n=state.queue[state.index];if(state.typed<n.text.length){state.typed=n.text.length;$('words').textContent=n.text;renderChoices(n);return}if(n.choices)return;state.index++;if(state.index<state.queue.length)showLine();else{ui.hide('dialogue');const done=afterDialogue;afterDialogue=null;if(done)done();else explore()}}
function renderChoices(n){if(!n.choices||!$('choices').hidden)return;ui.show('choices');n.choices.forEach(c=>{const b=document.createElement('button');b.textContent=c.label;b.onclick=()=>{ui.hide('dialogue');state.choice=c.id;c.run()};$('choices').append(b)})}
function chapter(act){state.act=act;state.trainStart=null;state.passenger=false;state.nightStart=state.elapsed;state.visited.clear();['dialogue','hotspots','exploreHint','quietPanel','ending','titleScreen'].forEach(ui.hide);state.mode='chapter';$('actLabel').textContent=act===1?'第一幕':'第二幕';$('chapterName').textContent=act===1?'今天还会来吗':'留一点温度';$('cardNumber').textContent=act===1?'第一幕 · 01':'第二幕 · 02';$('cardTitle').textContent=act===1?'今天还会来吗':'留一点温度';$('cardSub').textContent=act===1?'同一个地方，第一次黄昏。':'一班晚到的列车。一个暂时歇脚的人。';$('tint').style.opacity='0';document.querySelectorAll('.spot').forEach(s=>s.classList.remove('seen'));ui.show('chapterCard');ui.show('hud');ui.show('controls');$('pauseBtn').disabled=true}
function enterAct(){
 ui.hide('chapterCard');$('pauseBtn').disabled=false;
 if(state.act===1){talk([line('我','他只说，在这座车站见。'),line('我','没有说哪一班车，也没有说，几点。',1),line('风','树叶翻了个身。长椅另一头，空着。'),line('我','那就……先坐一会儿吧。')],explore)}
 else {state.tea=false;state.mode='arrival';state.trainStart=state.elapsed;state.passenger=false;ui.show('quietPanel');$('quietWords').textContent='这一次，远处传来的不只是风。';$('quietFill').style.width='0%';$('quietEnd').textContent='略过进站动画 →';trainSound();}
}
function finishArrival(){
 if(state.mode!=='arrival')return;
 state.trainStart=Math.min(state.trainStart,state.elapsed-8);ui.hide('quietPanel');
 talk([
 line('夜色','绿皮车缓缓停稳。车窗里的暖光，落在站台上。'),
 line('夜色','一个男人提着旧帆布包下了车，在长椅旁停下。'),
 line('旅客','这儿……有人吗？',2),
 line('我','没有。坐吧。',2),
 {...line('旅客','谢谢。坐了一天的车，腿都僵了。',2),seat:true},
 line('我','你也在这里等？',2),
 line('旅客','换乘。下一班，得后半夜了。',2),
 line('我','怎么不在候车室里？',2),
 line('旅客','有点闷。出来透口气。',2),
 line('夜色','他搓了搓手，把羽绒服的领子往上拢了拢。'),
 line('我','我在等一个人。他叫戈多。',2),
 line('旅客','等很久了？',2),
 line('我','昨天也在。',2),
 line('夜色','男人点了点头，没有再追问。'),
 line('旅客','有热水吗？刚才下车，手冻木了。',2),
 line('我','有。我还多带了一只杯子。',2)
 ],()=>{note('water','他问这里能不能坐。然后，我们一起等了一会儿。');explore()});
}
function explore(){state.mode='explore';state.head=0;['dialogue','quietPanel'].forEach(ui.hide);ui.show('hotspots');ui.show('exploreHint');const visited=state.visited.size;$('exploreText').textContent=visited>=3?'天色正在变深。你可以再坐一会儿，也可以让今天结束。':'点一点风景。每一件小事，都可以慢慢看。';$('leaveBtn').hidden=visited<3;$('leaveBtn').textContent=state.act===1?'听见站房里的声音 →':'和身旁的旅客说句话 →';$('skySpot').querySelector('span').textContent=state.act===1?'看一会儿云':'一起看一会儿云';$('treeSpot').querySelector('span').textContent=state.act===1?'听听树叶':'夜风与旧站灯';$('seatSpot').querySelector('span').textContent=state.act===1?'身旁的空位':'给旅客倒杯热水';document.querySelectorAll('.spot').forEach(b=>b.classList.toggle('seen',state.visited.has(b.dataset.place)))}
const scenes={1:{sky:[line('我','那片云，刚才还像一封没有寄出的信。'),line('我','再看一会儿，又什么都不像了。'),line('我','它也没有急着，要去哪里。')],tree:[line('风','沙沙——'),line('我','我转过头，以为有人来了。',2),line('我','原来是树叶。它们倒是每次都有回应。',2)],seat:[line('我','长椅上有一道很浅的划痕。',2),line('我','我把手边的落叶移开，空出一点地方。',2),line('我','如果他来了，就坐这里。')]},2:{sky:[
 line('我','天已经暗了。云还在往前走。'),
 line('旅客','白天在车窗里看了一路，倒没看清什么。',2),
 line('我','现在呢？',2),
 line('旅客','现在看清了。那块云，像一件晾着的旧棉袄。',2),
 line('夜色','你们又看了一会儿。云慢慢松开了袖子。')
 ],tree:[
 line('风','树冠被风推向一边。站灯轻轻闪了两下。'),
 line('我','灯快坏了吗？',2),
 line('旅客','兴许是接触不好。老车厢里也这样。',2),
 line('我','刚才树叶一响，我还以为有人走过来。',2),
 line('旅客','嗯。我刚下车，也以为有人在叫我。',2),
 line('夜色','谁都没有笑。你们把衣领又拢紧了一点。')
 ],seat:[
 line('我','我把另一只杯子拿出来，倒上热水。',2),
 line('旅客','本来给你朋友带的吧？',2),
 line('我','嗯。他还没来。你先暖暖手。',2),
 line('旅客','那我先借一会儿。',2),
 line('夜色','他的手指围住杯壁。杯口的热气，慢慢散开。')
 ]} };
const noteTexts={1:{sky:'云换了形状，我还在这里。',tree:'树叶响的时候，我以为是脚步。',seat:'替一个还没来的人，留了一点地方。'},2:{sky:'他说，那块云像晾着的旧棉袄。',tree:'我们都曾把风声听成一个人的声音。',seat:'为还没来的人带的杯子，先暖了赶路人的手。'}};
function observe(place){if(state.mode!=='explore'||state.paused)return;if(state.act===2&&place==='seat')state.tea=true;turn(place==='tree'?2:place==='seat'?2:0,3);talk(scenes[state.act][place],()=>{state.visited.add(place);note(`${state.act}-${place}`,noteTexts[state.act][place]);explore()})}
function leave(){if(state.mode!=='explore'||state.visited.size<3)return;if(state.act===1){talk([line('站房里的人','今天最后一班车，已经过去了。',1),line('我','……他说，今天会来。',1),line('站房里的人','那就明天再看看吧。',1),line('我','我坐了一会儿。没有马上站起来。'),line('我','灯还亮着。先把今天过完。')],()=>{note('day1','他今天没有来。灯替我多亮了一会儿。');chapter(2)})}else{talk([
 line('旅客','天黑得真快。',2),
 line('我','嗯。坐下的时候，还看得见太阳。',2),
 {...line('旅客','明天，你还来等吗？',2),choices:[
 {id:'tea',label:'来。我带两杯茶。',run:()=>finishChoice('来。我带两杯茶。','行。我那班车来之前，陪你坐会儿。')},
 {id:'walk',label:'想先去别处走走。',run:()=>finishChoice('想先去别处走走。','也好。走之前，把茶喝热乎。')},
 {id:'unsure',label:'还不知道。',run:()=>finishChoice('还不知道。','那就先坐着。我也还不走。')}
 ]}],showEnding)}}
function finishChoice(answer,reply){talk([line('我',answer,2),line('旅客',reply,2),line('夜色','绿皮车静静停着。我们各自捧着杯子，谁也没有催谁。')],()=>{note('reply',reply);showEnding()})}
function showEnding(){state.mode='ending';state.head=0;['dialogue','hotspots','exploreHint'].forEach(ui.hide);$('ending').querySelector('h2').innerHTML=state.choice==='walk'?'明天，<br>去别处走走。':state.choice==='unsure'?'明天，<br>也可以慢慢想。':'明天，<br>我带两杯茶。';$('endingNote').textContent=`两个黄昏，留下了 ${state.notes.length} 个片刻。`;ui.show('ending')}
function quiet(){if(state.mode!=='explore')return;state.mode='quiet';state.quietTime=state.elapsed;state.quietDone=false;$('quietEnd').textContent='继续坐着，或回到故事 →';['hotspots','exploreHint'].forEach(ui.hide);ui.show('quietPanel');$('quietWords').textContent='这十二秒，什么也不用做好。';$('quietFill').style.width='0%'}
function endQuiet(){if(state.mode==='arrival'){finishArrival();return}if(state.mode!=='quiet')return;explore()}
function togglePause(force){if(['title','chapter'].includes(state.mode))return;state.paused=typeof force==='boolean'?force:!state.paused;$('pauseBtn').textContent=state.paused?'继续':'暂停';$('pauseBtn').setAttribute('aria-pressed',state.paused);state.paused?ui.show('pausePanel'):ui.hide('pausePanel');syncAudio()}
// Gentle procedural ambience. No remote audio or network dependency.
function initAudio(){if(audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC){toast('这个浏览器暂不支持环境声');return}const ac=new AC(),master=ac.createGain();master.gain.value=0;master.connect(ac.destination);const buffer=ac.createBuffer(1,ac.sampleRate*4,ac.sampleRate),arr=buffer.getChannelData(0);let prev=0;for(let i=0;i<arr.length;i++){prev=(prev+(Math.random()*2-1)*.018)/1.018;arr[i]=prev*5}const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;const wind=ac.createGain();wind.gain.value=.3;noise.connect(filter).connect(wind).connect(master);noise.start();const lfo=ac.createOscillator(),depth=ac.createGain();lfo.frequency.value=.07;depth.gain.value=.11;lfo.connect(depth).connect(wind.gain);lfo.start();const rumble=ac.createOscillator(),trainGain=ac.createGain();rumble.type='triangle';rumble.frequency.value=47;trainGain.gain.value=0;rumble.connect(trainGain).connect(master);rumble.start();audio={ac,master,trainGain};}
function trainSound(){if(!audio)return;audio.trainGain.gain.setTargetAtTime(state.muted?0:.09,audio.ac.currentTime,.4)}
function syncAudio(){if(!audio)return;audio.master.gain.setTargetAtTime(!state.muted&&!state.paused&&!document.hidden?.34:0,audio.ac.currentTime,.6)}
function soundToggle(){initAudio();if(!audio)return;state.muted=!state.muted;audio.ac.resume().catch(()=>{});$('soundBtn').textContent=state.muted?'声音：关':'声音：开';$('soundBtn').setAttribute('aria-pressed',!state.muted);syncAudio()}
function chime(){if(!audio||state.muted||state.paused)return;const {ac,master}=audio;[523.25,659.25].forEach((hz,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,ac.currentTime+i*.23);g.gain.linearRampToValueAtTime(.017,ac.currentTime+i*.23+.025);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+i*.23+1.2);o.connect(g).connect(master);o.start(ac.currentTime+i*.23);o.stop(ac.currentTime+i*.23+1.3)})}
// Pixel layers retain the approved composition. Separate sky, foliage and head motion.
function imageLoad(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`图片加载失败：${src}`));im.src=src})}
let base,clean,headSheet,trainImage,travelerImage,headFrames=[],skyLayer,leafLayer,trainLayer,trainWindows,travelerLayer,travelerBounds;
function offscreen(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function prepareLayers(){trainLayer=isolate(trainImage).canvas;trainWindows=offscreen(trainLayer.width,trainLayer.height);const wp=trainWindows.getContext('2d');wp.drawImage(trainLayer,0,0);const wi=wp.getImageData(0,0,trainWindows.width,trainWindows.height);for(let i=0;i<wi.data.length;i+=4){const r=wi.data[i],g=wi.data[i+1],b=wi.data[i+2];if(r<150||r<g*1.15||g<b*1.12)wi.data[i+3]=0}wp.putImageData(wi,0,0);const traveler=isolate(travelerImage);travelerLayer=traveler.canvas;travelerBounds=traveler.bounds;const c=offscreen(),p=c.getContext('2d');p.drawImage(base,0,0,W,H);const mask=offscreen(),m=mask.getContext('2d');m.filter='blur(9px)';m.beginPath();m.moveTo(260,89);m.lineTo(614,65);m.lineTo(686,132);m.lineTo(680,238);m.lineTo(260,236);m.closePath();m.fill();p.globalCompositeOperation='destination-in';p.drawImage(mask,0,0);skyLayer=c;
 const leaves=offscreen(),l=leaves.getContext('2d');l.drawImage(base,0,0,W,H);const pixels=l.getImageData(0,0,W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];if(!(x>724&&y>120&&y<291&&g>r*.76&&r<185&&b<g*1.5&&g>b*.78))pixels.data[i+3]=0}l.putImageData(pixels,0,0);leafLayer=leaves;
 const sample=offscreen(headSheet.width,headSheet.height),s=sample.getContext('2d');s.drawImage(headSheet,0,0);const rgba=s.getImageData(0,0,sample.width,sample.height).data;for(let cell=0;cell<3;cell++){let minX=sample.width,minY=sample.height,maxX=0,maxY=0;const left=Math.floor(cell*sample.width/3),right=Math.floor((cell+1)*sample.width/3);for(let y=0;y<sample.height;y++)for(let x=left;x<right;x++){if(rgba[(y*sample.width+x)*4+3]>100){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}}headFrames.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1})}}
function drawHead(t){if(state.head&&state.elapsed>state.headUntil)turn(0);let dir=state.head;const turning=state.elapsed-state.headSince;if(!reduced&&dir&&turning<.12)dir=0;const f=headFrames[dir]||headFrames[0];if(!f)return;const dh=71,dw=Math.round(dh*f.w/f.h),bob=reduced?0:Math.sin(t*1.6)*.4+((turning<.35)?Math.sin(turning/.35*Math.PI):0);ctx.drawImage(headSheet,f.x,f.y,f.w,f.h,Math.round(375-dw/2),Math.round(319-dh+bob),dw,dh)}
function drawTea(t){if(state.act!==2)return;drawCup(326,t);if(state.tea)drawCup(414,t)}
function drawCup(x,t){const y=425;ctx.fillStyle='#412f3f';ctx.fillRect(x-2,y-1,13,14);ctx.fillStyle='#e4cba3';ctx.fillRect(x,y,8,10);ctx.fillStyle='#f9e0b0';ctx.fillRect(x-1,y-2,10,3);ctx.fillStyle='#6e4240';ctx.fillRect(x+1,y-1,6,2);ctx.fillStyle='#d3b393';ctx.fillRect(x+8,y+2,3,5);ctx.fillStyle='#59404b';ctx.fillRect(x+9,y+3,1,2);if(!reduced){for(let i=0;i<3;i++){const phase=(t*.24+i*.33)%1;ctx.globalAlpha=(1-phase)*.45;ctx.fillStyle='#ffe8c7';ctx.fillRect(Math.round(x+4+Math.sin(t+i)*2),Math.round(y-4-phase*23),2,4)}ctx.globalAlpha=1}}
function isolate(image){const c=offscreen(image.width,image.height),p=c.getContext('2d');p.drawImage(image,0,0);const data=p.getImageData(0,0,c.width,c.height);let left=c.width,top=c.height,right=0,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(data.data[i+3]<96)data.data[i+3]=0;else{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)}}p.putImageData(data,0,0);return {canvas:c,bounds:{x:left,y:top,w:right-left+1,h:bottom-top+1}}}
function drawTrain(windowsOnly=false){
 if(state.act!==2||state.trainStart===null)return;
 const progress=Math.min(1,(state.elapsed-state.trainStart)/8),eased=1-Math.pow(1-progress,3),scale=.025+.975*eased;
 ctx.save();ctx.translate(493,333);ctx.scale(scale,scale*.7);ctx.translate(-493,-333);ctx.drawImage(windowsOnly?trainWindows:trainLayer,0,0,W,H);ctx.restore();
}
function drawTraveler(t,relight=false){
 if(!state.passenger)return;
 const b=travelerBounds,settle=Math.min(1,(state.elapsed-state.passengerStart)/1.4),height=244,width=Math.round(height*b.w/b.h),x=Math.round(489-width/2),bob=reduced?0:Math.sin(t*1.3+.8)*.7;
 ctx.save();if(relight){ctx.beginPath();ctx.rect(420,252,145,114);ctx.rect(420,433,145,70);ctx.clip()}ctx.globalAlpha=settle*(relight?.32:1);ctx.drawImage(travelerLayer,b.x,b.y,b.w,b.h,x,Math.round(252+(1-settle)*7+bob),width,height);ctx.restore();if(relight)return;
 // The bench back stays in front of the seated coat, the man's boots below it.
 ctx.drawImage(base,216/W*base.width,366/H*base.height,355/W*base.width,67/H*base.height,216,366,355,67);
 // A battered canvas holdall rests next to the bench, below the seat.
 ctx.fillStyle='#2e2a34';ctx.fillRect(565,459,31,26);ctx.fillStyle='#6b5d50';ctx.fillRect(568,458,26,24);ctx.fillStyle='#93806a';ctx.fillRect(569,459,24,3);ctx.fillStyle='#3f3640';ctx.fillRect(577,453,9,3);ctx.fillRect(575,455,3,5);ctx.fillRect(585,455,3,5);ctx.fillStyle='#bd9b6d';ctx.fillRect(580,467,3,4);
}
function nightAmount(){return state.act===2?Math.min(1,(state.elapsed-state.nightStart)/5):0}
function lampLight(t,night){
 const cycle=t%17,blink=reduced?1:((cycle>9.2&&cycle<9.38)||(cycle>9.65&&cycle<9.78))?.35:1;
 const light=(.85+(!reduced?Math.sin(t*2.7)*.075+Math.sin(t*7.3)*.025:0))*blink;
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=4;i>0;i--){ctx.globalAlpha=night*light*.025;ctx.fillStyle='#ffc879';ctx.fillRect(184-i*15,121-i*13,i*30,i*26)}
 ctx.globalAlpha=(.12+night*.7)*light;ctx.fillStyle='#ffe3a0';ctx.fillRect(175,111,19,12);ctx.fillRect(178,123,13,4);
 ctx.fillStyle='#e4a65e';for(let i=4;i>0;i--){ctx.globalAlpha=night*light*.018;ctx.beginPath();ctx.ellipse(191,475,i*34,i*9,0,0,Math.PI*2);ctx.fill()}ctx.restore();
}
function render(t){
 ctx.drawImage(base,0,0,W,H);
 if(!reduced){
  ctx.drawImage(skyLayer,Math.round(Math.sin(t*.085)*45),Math.round(Math.sin(t*.11)*4));
  // Displace whole canopy strips, keeping its lower trunk rooted in place.
  for(let y=120;y<332;y+=4){const weight=(332-y)/212,offset=Math.round((Math.sin(t*1.15+y*.012)*6.5+Math.sin(t*.43)*3.5)*weight);ctx.drawImage(base,(700-offset)/W*base.width,y/H*base.height,260/W*base.width,4/H*base.height,700,y,260,4)}
 }
 drawTrain();
 ctx.drawImage(clean,582,426,145,132,582/1672*W,426/941*H,145/1672*W,132/941*H);drawHead(t);drawTraveler(t);drawTea(t);
 if(!reduced){for(let i=0;i<17;i++){const span=8+i*.8,phase=((t+i*4.9)%span)/span,x=825+i*10-phase*210+Math.sin(phase*17+i)*23,y=143+phase*312;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.round(Math.sin(t*2.1+i)*3)*Math.PI/4);ctx.globalAlpha=.65;ctx.fillStyle=i%2?'#cf9b5e':'#c9b269';ctx.fillRect(-2,-1,5,2);ctx.fillRect(-1,1,2,1);ctx.restore()}}
 const night=nightAmount();
 if(night){ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=night*.88;ctx.fillStyle='#56678f';ctx.fillRect(0,0,W,H);ctx.restore();ctx.fillStyle=`rgba(8,14,45,${night*.27})`;ctx.fillRect(0,0,W,H);
  for(const [x,y] of [[334,91],[504,69],[592,103],[650,78],[412,115]]){ctx.globalAlpha=night*.5;ctx.fillStyle='#d5dbee';ctx.fillRect(x,y,1,1)}ctx.globalAlpha=1;
 }
 if(night){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=night*.75;if(state.passenger){ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(463,249);ctx.lineTo(516,249);ctx.lineTo(520,295);ctx.lineTo(538,312);ctx.lineTo(550,366);ctx.lineTo(428,366);ctx.lineTo(440,312);ctx.lineTo(459,295);ctx.closePath();ctx.clip('evenodd')}drawTrain(true);ctx.restore();drawTraveler(t,true);ctx.save();ctx.globalAlpha=night*.22;drawHead(t);ctx.restore();ctx.save();ctx.globalAlpha=.7;drawTea(t);ctx.restore()}
 lampLight(t,night);
 if(state.act===2){ctx.globalAlpha=.5;for(let i=0;i<8;i++){const x=122+i*25+Math.sin(t*.3+i)*9,y=350+Math.sin(t*.8+i*3)*20;ctx.fillStyle='#ffe6a2';ctx.fillRect(Math.round(x),Math.round(y),1,1)}ctx.globalAlpha=1}
}
function frame(now){const dt=Math.min((now-lastFrame)/1000||0,.08);if(audio?.trainGain){const p=state.trainStart===null?1:Math.min(1,(state.elapsed-state.trainStart)/8);audio.trainGain.gain.setTargetAtTime(state.mode==='arrival'?(1-p)*.12:0,audio.ac.currentTime,.15)}lastFrame=now;if(!state.paused&&!document.hidden){state.elapsed+=dt;renderTime+=dt}if(state.loaded){if(now-state.frame>40){render(renderTime);state.frame=now}if(!state.paused&&state.mode==='dialogue'){const n=state.queue[state.index];if(n){const length=Math.min(n.text.length,Math.floor((state.elapsed-state.lineStarted)*22));if(length>state.typed){state.typed=length;$('words').textContent=n.text.slice(0,length)}if(state.typed>=n.text.length)renderChoices(n)}}if(!state.paused&&state.mode==='arrival'){const p=Math.min(1,(state.elapsed-state.trainStart)/8);$('quietFill').style.width=`${p*100}%`;$('quietWords').textContent=p>.8?'车轮的声音慢下来。窗里的灯，一盏盏停住。':'这一次，远处传来的不只是风。';if(p>=1)finishArrival()}if(!state.paused&&state.mode==='quiet'){const progress=Math.min(1,(state.elapsed-state.quietTime)/12);$('quietFill').style.width=`${progress*100}%`;if(progress>=1&&!state.quietDone){state.quietDone=true;$('quietWords').textContent='风走了一小段路。你也休息了一小会儿。';note(`quiet-${state.act}`,'有一会儿，我什么也没做。只是坐着。')}}}requestAnimationFrame(frame)}
function startGame(act){initAudio();if(audio){state.muted=false;audio.ac.resume().catch(()=>{});$('soundBtn').textContent='声音：开';$('soundBtn').setAttribute('aria-pressed','true');syncAudio()}chapter(act)}
$('startBtn').onclick=()=>startGame(1);
$('enterAct').onclick=()=>{chime();enterAct()};$('nextBtn').onclick=next;$('words').onclick=next;
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>observe(b.dataset.place));$('leaveBtn').onclick=leave;$('quietBtn').onclick=quiet;$('quietEnd').onclick=endQuiet;$('soundBtn').onclick=soundToggle;$('pauseBtn').onclick=()=>togglePause();$('resumeBtn').onclick=()=>togglePause(false);
$('journalBtn').onclick=()=>{renderNotes();ui.show('journal')};$('closeJournal').onclick=()=>ui.hide('journal');$('stayBtn').onclick=()=>{ui.hide('ending');state.mode='explore';state.head=0;explore();$('exploreText').textContent='故事先停在这里。你可以再听一会儿风。';$('leaveBtn').textContent='回到结尾 →';$('leaveBtn').onclick=showEnding};$('restartBtn').onclick=()=>{state.notes=[];state.tea=false;state.choice='';$('noteCount').textContent='0';$('leaveBtn').onclick=leave;chapter(1)};
document.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if(!$('journal').hidden){ui.hide('journal');return}togglePause();return}if((e.code==='Space'||e.code==='Enter')&&!['BUTTON','INPUT','TEXTAREA'].includes(document.activeElement.tagName)){if(state.mode==='dialogue'){e.preventDefault();next()}}});document.addEventListener('visibilitychange',syncAudio);
Promise.all([imageLoad('assets/station.png'),imageLoad('assets/station-clean.png'),imageLoad('assets/heads.png'),imageLoad('assets/green-train.png'),imageLoad('assets/traveler.png')]).then(images=>{[base,clean,headSheet,trainImage,travelerImage]=images;prepareLayers();state.loaded=true;ui.hide('loading')}).catch(err=>{$('loading').replaceChildren();const msg=document.createElement('p');msg.textContent='没能走到车站。请刷新页面再试一次。';$('loading').append(msg);console.error(err)});
requestAnimationFrame(frame);
// Inspectable state for prototype verification; no network telemetry or persistence.
window.gameDebug={state,chapter,enterAct,observe,next,leave,quiet,endQuiet,finishChoice,showEnding,finishArrival,render,headFrames};
