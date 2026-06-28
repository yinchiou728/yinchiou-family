import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, get } from "firebase/database";

// ── SCHEDULES ──────────────────────────────────────────────
const WELLS_SCHEDULE = {
  1: [
    { id: "w_malay1", time: "2:30–4pm", label: "Malay Tuition", teacher: "Teacher Tang", type: "tuition" },
    { id: "w_malay2", time: "4:30–6pm", label: "Malay Tuition", teacher: "Teacher Mashita", type: "tuition" },
    { id: "w_history", time: "8–9pm", label: "History Tuition", teacher: "", type: "tuition" },
  ],
  2: [
    { id: "w_chi_marie", time: "1:45–3:15pm", label: "Chinese Tuition", teacher: "Teacher Marie", type: "tuition" },
    { id: "w_piano_class", time: "3:30–4:15pm", label: "Piano Lesson", teacher: "", type: "piano_class" },
    { id: "w_emo", time: "6:30–8pm", label: "EMO", teacher: "", type: "activity" },
  ],
  3: [
    { id: "w_cca", time: "til 3pm", label: "CCA (School)", teacher: "", type: "school" },
    { id: "w_science", time: "4–5:30pm", label: "Science Tuition", teacher: "Teacher Tang", type: "tuition" },
  ],
  4: [
    { id: "w_maths", time: "2:30–4pm", label: "Maths Tuition", teacher: "Teacher Tang", type: "tuition" },
    { id: "w_dance", time: "4:30–5:30pm", label: "Dancing Class", teacher: "", type: "activity" },
  ],
  5: [
    { id: "w_chi_tang", time: "2:30–4pm", label: "Chinese Tuition", teacher: "Teacher Tang", type: "tuition" },
  ],
};

const MISHA_SCHEDULE = {
  2: [{ id: "m_pilates", time: "5–6pm", label: "Pilates", teacher: "", type: "activity" }],
  3: [{ id: "m_emo", time: "6:15–8:15pm", label: "EMO", teacher: "", type: "activity" }],
  4: [{ id: "m_dance", time: "4:30–5:30pm", label: "Dancing Class", teacher: "", type: "activity" }],
  5: [{ id: "m_science", time: "3:30–5pm", label: "Science Tuition", teacher: "", type: "tuition" }],
};

const CHILDREN = {
  misha: {
    id: "misha", name: "Misha", emoji: "🌸", color: "#a855f7", light: "#faf5ff", accent: "#7c3aed",
    homeTime: { 1:"4pm", 2:"4pm", 3:"4pm", 4:"4pm", 5:"2:20pm", 6:null, 0:null },
    schedule: MISHA_SCHEDULE,
    readingTarget: "1 hour",
    readingHasSummary: true,
  },
  wells: {
    id: "wells", name: "Wells", emoji: "⚡", color: "#0ea5e9", light: "#f0f9ff", accent: "#0369a1",
    homeTime: { 1:"1:20pm", 2:"1:20pm", 3:null, 4:"1:20pm", 5:"1pm", 6:null, 0:null },
    schedule: WELLS_SCHEDULE,
    readingTarget: "30 mins",
    readingHasSummary: false,
  },
};

const REFLECTION_QUESTIONS = [
  { id: "q_proud",    label: "What did you do really well today?",           emoji: "⭐", placeholder: "Today I was proud of..." },
  { id: "q_improve",  label: "What could you have done better today?",        emoji: "💪", placeholder: "I could improve on..." },
  { id: "q_grateful", label: "What are you grateful for today?",              emoji: "🙏", placeholder: "I'm grateful for..." },
  { id: "q_helped",   label: "Did you help someone today, or did someone help you?", emoji: "🤝", placeholder: "Today we helped each other by..." },
  { id: "q_mood",     label: "How are you feeling today?",                    emoji: "😊", type: "mood" },
  { id: "q_tomorrow", label: "What do you want to do better tomorrow?",       emoji: "🌅", placeholder: "Tomorrow I want to..." },
];

const MOODS = ["😄","😊","😐","😔","😤"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MEAL_SLOTS = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅", times: "7–8am" },
  { id: "lunch",     label: "Lunch",     emoji: "☀️", times: "12–1pm" },
  { id: "dinner",    label: "Dinner",    emoji: "🌙", times: "6–8pm" },
];

function getTodayKey() { return new Date().toISOString().slice(0,10); }
function getWeekStart(ds) {
  const d = new Date(ds+"T00:00:00"); const day = d.getDay();
  const diff = d.getDate() - day + (day===0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0,10);
}
function formatDate(ds) {
  const d = new Date(ds+"T00:00:00");
  return `${d.getMonth()+1}/${d.getDate()} ${DAY_NAMES[d.getDay()]}`;
}
function getDow(ds) { return new Date(ds+"T00:00:00").getDay(); }
function getWeekDates(ws) {
  const dates=[]; const base=new Date(ws+"T00:00:00");
  for(let i=0;i<7;i++){const d=new Date(base);d.setDate(base.getDate()+i);dates.push(d.toISOString().slice(0,10));}
  return dates;
}
function sk(childId,date){return `v2/${childId}/${date}`;}

async function loadDay(childId,date){
  try{
    const snap=await get(ref(db,sk(childId,date)));
    const data=snap.exists()?snap.val():{};
    const meals={...data.meals||{}};
    for(const mid of ["breakfast","lunch","dinner"]){
      for(const ba of ["before","after"]){
        try{const v=localStorage.getItem(`photo_${childId}_${date}_${mid}_${ba}`);if(v){if(!meals[mid])meals[mid]={};meals[mid][ba]=v;}}catch{}
      }
    }
    return {...emptyDay(),...data,meals};
  }catch{return null;}
}
async function saveDay(childId,date,data){
  try{await set(ref(db,sk(childId,date)),data);}catch{}
}
function emptyDay(){
  return {checks:{},meals:{},reflections:{},piano:{done:false,mins:""},reading:{done:false,mins:"",book:"",summary:""},extraActivity:"",missedReason:"",parentNote:{mummy:"",daddy:""},savedAt:null};
}
function fileToBase64(file){
  return new Promise((res,rej)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const canvas=document.createElement("canvas");
      const MAX=800;
      let w=img.width,h=img.height;
      if(w>h){if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}}else{if(h>MAX){w=Math.round(w*MAX/h);h=MAX;}}
      canvas.width=w;canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      res(canvas.toDataURL("image/jpeg",0.7));
    };
    img.onerror=rej;
    img.src=url;
  });
}

// ══════════════════════════════════════════════════════════════
export default function App() {
  const [page,setPage]=useState("home");
  const [activeChild,setActiveChild]=useState("misha");
  const [selectedDate,setSelectedDate]=useState(getTodayKey());
  const [dayData,setDayData]=useState(emptyDay());
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [pinUnlocked,setPinUnlocked]=useState(false);

  const isToday=selectedDate===getTodayKey();
  const dow=getDow(selectedDate);
  const child=CHILDREN[activeChild];
  const todaySchedule=child.schedule[dow]||[];

  useEffect(()=>{if(page==="child")loadChildDay();},[activeChild,selectedDate,page]);

  async function loadChildDay(){const d=await loadDay(activeChild,selectedDate);setDayData(d||emptyDay());}

  async function persist(updated){
    setDayData(updated);setSaving(true);
    await saveDay(activeChild,selectedDate,{...updated,savedAt:new Date().toISOString()});
    setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),1500);
  }

  function toggleCheck(id){if(!isToday)return;persist({...dayData,checks:{...dayData.checks,[id]:!dayData.checks[id]}});}
  function setPiano(field,val){if(!isToday)return;persist({...dayData,piano:{...dayData.piano,[field]:val}});}
  function setReading(field,val){if(!isToday)return;persist({...dayData,reading:{...dayData.reading,[field]:val}});}
  function setReflection(id,val){if(!isToday)return;persist({...dayData,reflections:{...dayData.reflections,[id]:val}});}
  function setExtra(field,val){if(!isToday)return;persist({...dayData,[field]:val});}
  function setParentNote(who,val){persist({...dayData,parentNote:{...dayData.parentNote,[who]:val}});}
  async function uploadMealPhoto(mealId,ba,file){
    if(!isToday)return;
    try{
      const b64=await fileToBase64(file);
      const lsKey=`photo_${activeChild}_${selectedDate}_${mealId}_${ba}`;
      localStorage.setItem(lsKey,b64);
      const m=dayData.meals||{};
const updated={...dayData,meals:{...m,[mealId]:{...(m[mealId]||{}),[ba]:b64}}};
      setDayData(updated);
      setSaved(true);setTimeout(()=>setSaved(false),1500);
    }catch(e){alert("Photo error: "+e.message);}
  }
  function removeMealPhoto(mealId,ba){
    if(!isToday)return;
    const meal={...dayData.meals[mealId]};delete meal[ba];
    persist({...dayData,meals:{...dayData.meals,[mealId]:meal}});
  }

  const doneSched=todaySchedule.filter(t=>dayData.checks[t.id]).length;
  const totalItems=todaySchedule.length+2;
  const doneItems=doneSched+(dayData.piano?.done?1:0)+(dayData.reading?.done?1:0);
  const pct=totalItems>0?Math.round(doneItems/totalItems*100):0;

  async function exportAllData(){
    try{
      const exportObj={exportedAt:new Date().toISOString(),family:"Chiou & Gan",children:{}};
      for(const cid of Object.keys(CHILDREN)){
        try{
          const snap=await get(ref(db,`v2/${cid}`));
          if(snap.exists()) exportObj.children[cid]=snap.val();
        }catch{}
      }
      const blob=new Blob([JSON.stringify(exportObj,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`family-tracker-backup-${getTodayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }catch(e){alert("Export failed: "+e.message);}
  }

  // HOME
  if(page==="home") return (
    <div style={S.bg}>
      <div style={{background:"#1a1625",padding:"20px 16px 16px"}}>
        <div style={{color:"#fff",fontSize:22,fontWeight:800,letterSpacing:-0.5}}>🏠 Daily Tracker</div>
        <div style={{color:"#8b7bb5",fontSize:12,marginTop:2}}>Chiou & Gan Family</div>
      </div>
      <div style={{padding:"20px 16px",maxWidth:440,margin:"0 auto"}}>
        <div style={{fontSize:13,color:"#9ca3af",marginBottom:18,textAlign:"center"}}>Today — {formatDate(getTodayKey())}</div>

        {Object.values(CHILDREN).map(c=>(
          <button key={c.id} onClick={()=>{setActiveChild(c.id);setSelectedDate(getTodayKey());setPage("child");}}
            style={{width:"100%",background:"#fff",border:`2px solid ${c.color}33`,borderRadius:20,padding:"18px 20px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",gap:16,textAlign:"left",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{width:52,height:52,borderRadius:16,background:c.light,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{c.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:17,color:"#1a1625"}}>{c.name}'s Daily Checklist</div>
              <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>Tap to check in →</div>
            </div>
            <div style={{width:40,height:40,borderRadius:"50%",background:c.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18}}>→</div>
          </button>
        ))}

        <div style={{height:14}}/>
        <button onClick={()=>setPage("parent")}
          style={{width:"100%",background:"#1a1625",border:"none",borderRadius:20,padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
          <span style={{fontSize:26}}>👀</span>
          <div style={{textAlign:"left"}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Parent Overview</div>
            <div style={{color:"#8b7bb5",fontSize:12}}>Check kids' progress · History</div>
          </div>
        </button>
        <button onClick={()=>setPage("report")}
          style={{width:"100%",background:"#0f172a",border:"none",borderRadius:20,padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
          <span style={{fontSize:26}}>📊</span>
          <div style={{textAlign:"left"}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Weekly Report</div>
            <div style={{color:"#64748b",fontSize:12}}>Completion rate · Trends</div>
          </div>
        </button>

        {/* BACKUP */}
        <button onClick={exportAllData}
          style={{width:"100%",background:"#064e3b",border:"none",borderRadius:20,padding:"16px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:26}}>💾</span>
          <div style={{textAlign:"left"}}>
            <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Backup All Data</div>
            <div style={{color:"#6ee7b7",fontSize:12}}>Download a copy · Save to Google Drive</div>
          </div>
        </button>

        <div style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:12,lineHeight:1.6}}>
          💡 Tip: Back up monthly and save to Google Drive or iCloud to keep your records safe long-term.
        </div>
      </div>
    </div>
  );

  // CHILD VIEW
  if(page==="child") return (
    <div style={S.bg}>
      <div style={{background:child.accent,padding:"14px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={()=>setPage("home")} style={S.backBtn}>← Back</button>
          <div style={{color:"#fff",fontWeight:700,fontSize:17}}>{child.emoji} {child.name}</div>
          {saving&&<div style={{color:"rgba(255,255,255,0.7)",fontSize:11,marginLeft:"auto"}}>Saving...</div>}
          {saved&&<div style={{color:"#fff",fontSize:11,marginLeft:"auto"}}>✓ Saved</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <input type="date" value={selectedDate} max={getTodayKey()} onChange={e=>setSelectedDate(e.target.value)}
            style={{flex:1,border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,padding:"6px 10px",fontSize:13,background:"rgba(255,255,255,0.15)",color:"#fff",colorScheme:"dark"}}/>
          <div style={{color:"rgba(255,255,255,0.85)",fontSize:12,whiteSpace:"nowrap"}}>
            {child.homeTime[dow]?`🏠 Home by ${child.homeTime[dow]}`:"Weekend"}
          </div>
        </div>
        {!isToday&&<div style={{marginTop:6,fontSize:11,color:"rgba(255,255,255,0.6)",background:"rgba(0,0,0,0.2)",borderRadius:6,padding:"3px 8px",display:"inline-block"}}>Past record (read-only)</div>}
      </div>

      <div style={{background:"#fff",padding:"12px 16px",borderBottom:"1px solid #f0f0f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:13,color:"#6b7280"}}>Today's progress</span>
          <span style={{fontSize:14,fontWeight:700,color:child.accent}}>{pct}% done</span>
        </div>
        <div style={{background:"#f3f4f6",borderRadius:8,height:10}}>
          <div style={{width:`${pct}%`,height:"100%",borderRadius:8,background:`linear-gradient(90deg,${child.color},${child.accent})`,transition:"width 0.4s"}}/>
        </div>
        {pct===100&&<div style={{textAlign:"center",fontSize:13,color:child.accent,fontWeight:600,marginTop:6}}>🎉 All done today! Amazing!</div>}
      </div>

      <div style={{padding:"12px 14px 40px",maxWidth:500,margin:"0 auto"}}>

        {/* PARENT MESSAGE — shown to child as a warm card at top */}
        {(dayData.parentNote?.mummy||dayData.parentNote?.daddy)&&(
          <div style={{background:`linear-gradient(135deg,${child.color}18,${child.accent}0a)`,border:`1.5px solid ${child.color}44`,borderRadius:16,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:child.accent,letterSpacing:0.5,marginBottom:10}}>💌 A MESSAGE FOR YOU</div>
            {dayData.parentNote?.mummy&&<div style={{marginBottom:dayData.parentNote?.daddy?10:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#e879a0",marginBottom:3}}>👩 Mummy says:</div>
              <div style={{fontSize:13,color:"#374151",lineHeight:1.6,fontStyle:"italic"}}>"{dayData.parentNote.mummy}"</div>
            </div>}
            {dayData.parentNote?.daddy&&<div>
              <div style={{fontSize:11,fontWeight:700,color:"#3b82f6",marginBottom:3}}>👨 Daddy says:</div>
              <div style={{fontSize:13,color:"#374151",lineHeight:1.6,fontStyle:"italic"}}>"{dayData.parentNote.daddy}"</div>
            </div>}
          </div>
        )}

        {/* SCHEDULE */}
        <Sect title="📅 Today's Classes & Activities" color={child.color}>
          {todaySchedule.length===0
            ?<div style={{color:"#9ca3af",fontSize:13,padding:"8px 4px"}}>No classes today 🎉</div>
            :todaySchedule.map(item=>(
              <ChkRow key={item.id} checked={!!dayData.checks[item.id]} onToggle={()=>toggleCheck(item.id)} disabled={!isToday} color={child.color}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:dayData.checks[item.id]?"#9ca3af":"#1a1625",textDecoration:dayData.checks[item.id]?"line-through":"none"}}>
                    {item.label}{item.teacher&&<span style={{fontSize:11,color:"#9ca3af",fontWeight:400,marginLeft:6}}>({item.teacher})</span>}
                  </div>
                  <div style={{fontSize:11,color:"#9ca3af"}}>{item.time}</div>
                </div>
              </ChkRow>
            ))
          }
        </Sect>

        {/* PIANO */}
        <Sect title="🎹 Piano Practice (min. 30 mins)" color={child.color}>
          <ChkRow checked={!!dayData.piano?.done} onToggle={()=>setPiano("done",!dayData.piano?.done)} disabled={!isToday} color={child.color}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:dayData.piano?.done?"#9ca3af":"#1a1625"}}>Practised piano today</div>
            </div>
            <input type="number" placeholder="mins" value={dayData.piano?.mins||""} onChange={e=>setPiano("mins",e.target.value)} disabled={!isToday}
              style={{width:60,border:"1px solid #e5e7eb",borderRadius:8,padding:"4px 8px",fontSize:13,textAlign:"center"}} onClick={e=>e.stopPropagation()}/>
          </ChkRow>
        </Sect>

        {/* READING */}
        <Sect title={`📖 Reading (${child.readingTarget})`} color={child.color}>
          <ChkRow checked={!!dayData.reading?.done} onToggle={()=>setReading("done",!dayData.reading?.done)} disabled={!isToday} color={child.color}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:dayData.reading?.done?"#9ca3af":"#1a1625"}}>Read today</div>
            </div>
            <input type="number" placeholder="mins" value={dayData.reading?.mins||""} onChange={e=>setReading("mins",e.target.value)} disabled={!isToday}
              style={{width:60,border:"1px solid #e5e7eb",borderRadius:8,padding:"4px 8px",fontSize:13,textAlign:"center"}} onClick={e=>e.stopPropagation()}/>
          </ChkRow>
          {/* Book title — both kids */}
          <div style={{padding:"10px 0 6px"}}>
            <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600}}>📚 BOOK TITLE</div>
            <input type="text" placeholder="What book did you read today?" value={dayData.reading?.book||""}
              onChange={e=>setReading("book",e.target.value)} disabled={!isToday}
              style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",fontSize:13,boxSizing:"border-box",fontFamily:"inherit",background:!isToday?"#f9fafb":"#fff"}}/>
          </div>
          {/* Book summary — Misha only */}
          {child.readingHasSummary&&(
            <div style={{padding:"6px 0 8px"}}>
              <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600}}>✍️ WHAT WAS IT ABOUT? (SUMMARY)</div>
              <textarea placeholder="Write a short summary of what you read today..." value={dayData.reading?.summary||""}
                onChange={e=>setReading("summary",e.target.value)} disabled={!isToday} rows={3}
                style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:!isToday?"#f9fafb":"#fff"}}/>
            </div>
          )}
        </Sect>

        {/* MEALS */}
        <Sect title="🍽️ Meals" color={child.color}>
          {MEAL_SLOTS.map(meal=>{
            const md=dayData.meals?.[meal.id]||{};
            return(
              <div key={meal.id} style={{marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:8}}>
                  {meal.emoji} {meal.label} <span style={{fontSize:11,color:"#9ca3af",fontWeight:400}}>{meal.times}</span>
                </div>
                <div style={{display:"flex",gap:8}}>
                  {["before","after"].map(ba=>(
                    <PhotoSlot key={ba} label={ba==="before"?"Before":"After"} img={md[ba]} disabled={!isToday}
                      onUpload={file=>uploadMealPhoto(meal.id,ba,file)}
                      onRemove={()=>removeMealPhoto(meal.id,ba)} color={child.color}/>
                  ))}
                </div>
              </div>
            );
          })}
        </Sect>

        {/* REFLECTION */}
        <Sect title="💭 Daily Reflection" color={child.color}>
          {REFLECTION_QUESTIONS.map(q=>(
            <div key={q.id} style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:6}}>{q.emoji} {q.label}</div>
              {q.type==="mood"
                ?<div style={{display:"flex",gap:10}}>
                  {MOODS.map(m=>(
                    <button key={m} onClick={()=>setReflection(q.id,m)} disabled={!isToday}
                      style={{fontSize:26,background:dayData.reflections?.[q.id]===m?child.light:"transparent",border:`2px solid ${dayData.reflections?.[q.id]===m?child.color:"#e5e7eb"}`,borderRadius:12,padding:6,cursor:isToday?"pointer":"default",transition:"all 0.15s"}}>
                      {m}
                    </button>
                  ))}
                </div>
                :<textarea value={dayData.reflections?.[q.id]||""} placeholder={q.placeholder}
                  onChange={e=>setReflection(q.id,e.target.value)} disabled={!isToday} rows={2}
                  style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:!isToday?"#f9fafb":"#fff"}}/>
              }
            </div>
          ))}
        </Sect>

        {/* EXTRA ACTIVITY & MISSED REASON */}
        <Sect title="📝 Today's Notes" color={child.color}>
          <div style={{padding:"10px 0 6px"}}>
            <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600}}>🌟 EXTRA ACTIVITY TODAY (anything unplanned you did!)</div>
            <textarea placeholder="e.g. Went to cousin's birthday, had extra swimming class, helped cook dinner..." value={dayData.extraActivity||""}
              onChange={e=>setExtra("extraActivity",e.target.value)} disabled={!isToday} rows={2}
              style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:!isToday?"#f9fafb":"#fff"}}/>
          </div>
          <div style={{padding:"6px 0 10px"}}>
            <div style={{fontSize:12,color:"#9ca3af",marginBottom:5,fontWeight:600}}>❓ REASON FOR ANY UNCOMPLETED TASK</div>
            <textarea placeholder="e.g. Skipped piano because I had a headache, couldn't finish homework because tuition ran late..." value={dayData.missedReason||""}
              onChange={e=>setExtra("missedReason",e.target.value)} disabled={!isToday} rows={2}
              style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:!isToday?"#f9fafb":"#fff"}}/>
          </div>
        </Sect>

      </div>
    </div>
  );

  if(page==="parent") return <ParentView onBack={()=>setPage("home")} pinUnlocked={pinUnlocked} setPinUnlocked={setPinUnlocked}/>;
  if(page==="report") return <WeeklyReport onBack={()=>setPage("home")}/>;
}

// ── PHOTO SLOT ───────────────────────────────────────────────
function PhotoSlot({label,img,onUpload,onRemove,disabled,color}){
  const ref=useRef();
  return(
    <div style={{flex:1}}>
      <div style={{fontSize:11,color:"#9ca3af",marginBottom:4,textAlign:"center"}}>{label}</div>
      {img
        ?<div style={{position:"relative"}}>
          <img src={img} alt={label} style={{width:"100%",height:90,objectFit:"cover",borderRadius:10,display:"block"}}/>
          {!disabled&&<button onClick={onRemove} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:22,height:22,color:"#fff",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
        </div>
        :<div onClick={()=>!disabled&&ref.current?.click()}
          style={{height:90,border:`2px dashed ${disabled?"#e5e7eb":color}`,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:disabled?"default":"pointer",background:disabled?"#f9fafb":"#fafafa",gap:4}}>
          <span style={{fontSize:22}}>📷</span>
          {!disabled&&<span style={{fontSize:10,color:"#9ca3af"}}>Tap to upload</span>}
        </div>
      }
      {!disabled&&<input ref={ref} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&onUpload(e.target.files[0])}/>}
    </div>
  );
}

function Sect({title,color,children}){
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:12,fontWeight:700,color,letterSpacing:0.5,marginBottom:8,textTransform:"uppercase"}}>{title}</div>
      <div style={{background:"#fff",borderRadius:14,padding:"4px 14px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>{children}</div>
    </div>
  );
}

function ChkRow({checked,onToggle,disabled,color,children}){
  return(
    <div onClick={()=>!disabled&&onToggle()} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #f3f4f6",cursor:disabled?"default":"pointer"}}>
      <div style={{width:24,height:24,borderRadius:7,border:`2.5px solid ${checked?color:"#d1d5db"}`,background:checked?color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
        {checked&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
      </div>
      {children}
    </div>
  );
}

// ── PARENT VIEW ──────────────────────────────────────────────
function ParentView({onBack,pinUnlocked,setPinUnlocked}){
  const [input,setInput]=useState("");
  const [error,setError]=useState(false);
  const [selectedDate,setSelectedDate]=useState(getTodayKey());
  const [data,setData]=useState({});
  const [loading,setLoading]=useState(false);
  const PIN="1234";

  useEffect(()=>{if(pinUnlocked)loadAll();},[pinUnlocked,selectedDate]);

  async function loadAll(){
    setLoading(true);const result={};
    for(const cid of Object.keys(CHILDREN)){const d=await loadDay(cid,selectedDate);result[cid]=d||emptyDay();}
    setData(result);setLoading(false);
  }

  function tryPin(){if(input===PIN){setPinUnlocked(true);setInput("");setError(false);}else setError(true);}

  if(!pinUnlocked) return(
    <div style={S.bg}>
      <div style={{background:"#1a1625",padding:"16px 16px 12px"}}>
        <button onClick={onBack} style={S.backBtn}>← Back</button>
        <div style={{color:"#fff",fontSize:18,fontWeight:700,marginTop:4}}>👀 Parent Overview</div>
      </div>
      <div style={{padding:32,maxWidth:360,margin:"0 auto",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>🔒</div>
        <div style={{fontSize:16,fontWeight:600,color:"#1a1625",marginBottom:8}}>Enter Parent PIN</div>
        <div style={{fontSize:13,color:"#9ca3af",marginBottom:20}}>Default PIN: 1234</div>
        <input type="password" value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Enter PIN" maxLength={6}
          style={{width:"100%",border:`2px solid ${error?"#ef4444":"#e5e7eb"}`,borderRadius:12,padding:"12px 16px",fontSize:18,textAlign:"center",letterSpacing:6,boxSizing:"border-box",marginBottom:12}}/>
        {error&&<div style={{color:"#ef4444",fontSize:13,marginBottom:8}}>Wrong PIN, please try again</div>}
        <button onClick={tryPin} style={{width:"100%",background:"#1a1625",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer"}}>Enter</button>
      </div>
    </div>
  );

  const dow=getDow(selectedDate);
  return(
    <div style={S.bg}>
      <div style={{background:"#1a1625",padding:"14px 16px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={onBack} style={S.backBtn}>← Back</button>
          <div style={{color:"#fff",fontSize:17,fontWeight:700}}>👀 Parent Overview</div>
          <button onClick={()=>setPinUnlocked(false)} style={{marginLeft:"auto",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"4px 10px",color:"#9ca3af",cursor:"pointer",fontSize:12}}>Lock</button>
        </div>
        <input type="date" value={selectedDate} max={getTodayKey()} onChange={e=>setSelectedDate(e.target.value)}
          style={{width:"100%",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"7px 12px",fontSize:13,background:"rgba(255,255,255,0.1)",color:"#fff",colorScheme:"dark",boxSizing:"border-box"}}/>
      </div>

      {loading?<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Loading...</div>:(
        <div style={{padding:"12px 14px 40px",maxWidth:500,margin:"0 auto"}}>
          {Object.values(CHILDREN).map(c=>{
            const cd=data[c.id]||emptyDay();
            const sched=c.schedule[dow]||[];
            const doneSched=sched.filter(t=>cd.checks[t.id]).length;
            const piano=cd.piano?.done; const reading=cd.reading?.done;
            const totalC=sched.length+2; const doneC=doneSched+(piano?1:0)+(reading?1:0);
            const pct=totalC>0?Math.round(doneC/totalC*100):0;
            return(
              <div key={c.id} style={{background:"#fff",borderRadius:18,padding:18,marginBottom:16,border:`2px solid ${pct===100?c.color:"#f0f0f0"}`,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <span style={{fontSize:30}}>{c.emoji}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:16,color:"#1a1625"}}>{c.name}</div>
                    <div style={{fontSize:12,color:"#9ca3af"}}>{doneC}/{totalC} tasks done</div>
                  </div>
                  <div style={{width:52,height:52,borderRadius:"50%",background:pct===100?c.color:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,color:pct===100?"#fff":"#374151"}}>{pct}%</div>
                </div>
                <div style={{background:"#f3f4f6",borderRadius:8,height:8,marginBottom:14}}>
                  <div style={{width:`${pct}%`,height:"100%",borderRadius:8,background:c.color,transition:"width 0.4s"}}/>
                </div>

                {sched.length>0&&(
                  <div style={{marginBottom:10}}>
                    <div style={S.lbl}>📅 Classes Today</div>
                    {sched.map(t=>(
                      <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontSize:15}}>{cd.checks[t.id]?"✅":"⬜"}</span>
                        <span style={{fontSize:13,color:cd.checks[t.id]?"#6b7280":"#1a1625"}}>{t.label}</span>
                        <span style={{fontSize:11,color:"#9ca3af"}}>{t.time}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",gap:16,marginBottom:10}}>
                  <div style={{flex:1}}>
                    <div style={S.lbl}>🎹 Piano</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span>{piano?"✅":"⬜"}</span>
                      <span style={{fontSize:13,color:"#374151"}}>{cd.piano?.mins?`${cd.piano.mins} mins`:"Not recorded"}</span>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S.lbl}>📖 Reading</div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span>{reading?"✅":"⬜"}</span>
                      <span style={{fontSize:13,color:"#374151"}}>{cd.reading?.mins?`${cd.reading.mins} mins`:"Not recorded"}</span>
                    </div>
                  </div>
                </div>

                {/* Book info */}
                {(cd.reading?.book||cd.reading?.summary)&&(
                  <div style={{background:"#f9fafb",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                    {cd.reading?.book&&<div style={{fontSize:13,color:"#374151",marginBottom:4}}>📚 <strong>Book:</strong> {cd.reading.book}</div>}
                    {cd.reading?.summary&&<div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>✍️ <strong>Summary:</strong> {cd.reading.summary}</div>}
                  </div>
                )}

                {/* Meals */}
                <div style={{marginBottom:10}}>
                  <div style={S.lbl}>🍽️ Meals</div>
                  <div style={{display:"flex",gap:8}}>
                    {MEAL_SLOTS.map(m=>{
                      const md=cd.meals?.[m.id]||{};
                      return(
                        <div key={m.id} style={{flex:1,textAlign:"center"}}>
                          <div style={{fontSize:11,color:"#9ca3af",marginBottom:4}}>{m.emoji}{m.label}</div>
                          {md.after
                            ?<img src={md.after} alt="" style={{width:"100%",height:56,objectFit:"cover",borderRadius:8}}/>
                            :<div style={{height:56,background:"#f9fafb",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>—</div>
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reflections */}
                {Object.keys(cd.reflections||{}).length>0&&(
                  <div style={{marginBottom:10}}>
                    <div style={S.lbl}>💭 Reflection</div>
                    {REFLECTION_QUESTIONS.map(q=>{
                      const val=cd.reflections?.[q.id];if(!val)return null;
                      return <div key={q.id} style={{fontSize:12,color:"#374151",marginBottom:4}}><span style={{color:"#9ca3af"}}>{q.emoji} </span>{val}</div>;
                    })}
                  </div>
                )}

                {/* Extra activity & missed reason */}
                {(cd.extraActivity||cd.missedReason)&&(
                  <div style={{background:"#f9fafb",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
                    {cd.extraActivity&&<div style={{marginBottom:cd.missedReason?8:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:2}}>🌟 EXTRA ACTIVITY</div>
                      <div style={{fontSize:13,color:"#374151"}}>{cd.extraActivity}</div>
                    </div>}
                    {cd.missedReason&&<div>
                      <div style={{fontSize:11,fontWeight:700,color:"#9ca3af",marginBottom:2}}>❓ MISSED TASK REASON</div>
                      <div style={{fontSize:13,color:"#374151"}}>{cd.missedReason}</div>
                    </div>}
                  </div>
                )}

                {/* Parent note — write here */}
                <div style={{borderTop:"1px solid #f0f0f0",paddingTop:12,marginTop:4}}>
                  <div style={S.lbl}>💌 Write a message to {c.name}</div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#e879a0",marginBottom:4}}>👩 Mummy's message</div>
                    <textarea placeholder={`Write something for ${c.name} to read...`} value={cd.parentNote?.mummy||""}
                      onChange={async e=>{const upd={...cd,parentNote:{...cd.parentNote,mummy:e.target.value}};setData(prev=>({...prev,[c.id]:upd}));await saveDay(c.id,selectedDate,upd);}} rows={2}
                      style={{width:"100%",border:"1.5px solid #fce7f3",borderRadius:10,padding:"8px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:"#fff9fb"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#3b82f6",marginBottom:4}}>👨 Daddy's message</div>
                    <textarea placeholder={`Write something for ${c.name} to read...`} value={cd.parentNote?.daddy||""}
                      onChange={async e=>{const upd={...cd,parentNote:{...cd.parentNote,daddy:e.target.value}};setData(prev=>({...prev,[c.id]:upd}));await saveDay(c.id,selectedDate,upd);}} rows={2}
                      style={{width:"100%",border:"1.5px solid #dbeafe",borderRadius:10,padding:"8px 12px",fontSize:13,resize:"none",fontFamily:"inherit",boxSizing:"border-box",background:"#f0f7ff"}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── WEEKLY REPORT ────────────────────────────────────────────
function WeeklyReport({onBack}){
  const [weekStart,setWeekStart]=useState(getWeekStart(getTodayKey()));
  const [reportData,setReportData]=useState(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{loadReport();},[weekStart]);

  async function loadReport(){
    setLoading(true);const result={};
    for(const cid of Object.keys(CHILDREN)){
      result[cid]={};
      for(const d of getWeekDates(weekStart)){result[cid][d]=await loadDay(cid,d)||emptyDay();}
    }
    setReportData(result);setLoading(false);
  }

  const dates=getWeekDates(weekStart);
  const isCurrentWeek=weekStart===getWeekStart(getTodayKey());

  function prevWeek(){const d=new Date(weekStart+"T00:00:00");d.setDate(d.getDate()-7);setWeekStart(d.toISOString().slice(0,10));}
  function nextWeek(){const d=new Date(weekStart+"T00:00:00");d.setDate(d.getDate()+7);const n=d.toISOString().slice(0,10);if(n<=getWeekStart(getTodayKey()))setWeekStart(n);}

  return(
    <div style={S.bg}>
      <div style={{background:"#0f172a",padding:"14px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <button onClick={onBack} style={S.backBtn}>← Back</button>
          <div style={{color:"#fff",fontSize:17,fontWeight:700}}>📊 Weekly Report</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={prevWeek} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",cursor:"pointer"}}>‹</button>
          <div style={{flex:1,textAlign:"center",color:"#94a3b8",fontSize:13}}>{formatDate(dates[0])} – {formatDate(dates[6])}</div>
          <button onClick={nextWeek} disabled={isCurrentWeek} style={{background:isCurrentWeek?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.1)",border:"none",borderRadius:8,padding:"6px 12px",color:isCurrentWeek?"#4b5563":"#fff",cursor:isCurrentWeek?"default":"pointer"}}>›</button>
        </div>
      </div>

      {loading?<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Loading...</div>:reportData&&(
        <div style={{padding:"14px 14px 40px",maxWidth:500,margin:"0 auto"}}>
          {Object.values(CHILDREN).map(c=>{
            const cData=reportData[c.id]||{};
            let pianoDays=0,readingDays=0,totalMeals=0,uploadedMeals=0,schedCompleted=0,schedTotal=0;
            const dailyPcts=[];
            dates.forEach(d=>{
              const dd=cData[d]||emptyDay();const dow=getDow(d);
              const sched=c.schedule[dow]||[];
              const dSched=sched.filter(t=>dd.checks[t.id]).length;
              schedCompleted+=dSched;schedTotal+=sched.length;
              if(dd.piano?.done)pianoDays++;
              if(dd.reading?.done)readingDays++;
              MEAL_SLOTS.forEach(m=>{totalMeals++;if(dd.meals?.[m.id]?.after)uploadedMeals++;});
              const total=sched.length+2;const done=dSched+(dd.piano?.done?1:0)+(dd.reading?.done?1:0);
              dailyPcts.push(total>0?Math.round(done/total*100):0);
            });
            const avgPct=Math.round(dailyPcts.reduce((a,b)=>a+b,0)/7);

            // Reading log for the week
            const readingLog=dates.map(d=>{
              const dd=cData[d]||emptyDay();
              return dd.reading?.book?{date:d,book:dd.reading.book,summary:dd.reading.summary,mins:dd.reading.mins}:null;
            }).filter(Boolean);

            // Notes log (extra activity / missed reason)
            const notesLog=dates.map(d=>{
              const dd=cData[d]||emptyDay();
              return (dd.extraActivity||dd.missedReason)?{date:d,extra:dd.extraActivity,missed:dd.missedReason}:null;
            }).filter(Boolean);

            return(
              <div key={c.id} style={{background:"#fff",borderRadius:18,padding:18,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <span style={{fontSize:28}}>{c.emoji}</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:16,color:"#1a1625"}}>{c.name} — This Week</div>
                    <div style={{fontSize:12,color:"#9ca3af"}}>Avg completion <span style={{color:c.accent,fontWeight:700}}>{avgPct}%</span></div>
                  </div>
                </div>

                <div style={{marginBottom:14}}>
                  <div style={S.lbl}>Daily Completion</div>
                  <div style={{display:"flex",gap:4,alignItems:"flex-end",height:60}}>
                    {dates.map((d,i)=>{
                      const p=dailyPcts[i];const isFuture=d>getTodayKey();
                      return(
                        <div key={d} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                          <div style={{fontSize:10,color:"#9ca3af"}}>{p>0?p+"%":""}</div>
                          <div style={{width:"100%",height:Math.max(4,p*0.44),borderRadius:4,background:isFuture?"#f3f4f6":p===100?c.color:p>60?c.color+"99":"#e5e7eb",transition:"height 0.3s"}}/>
                          <div style={{fontSize:10,color:"#9ca3af"}}>{DAY_NAMES[getDow(d)].slice(0,1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  <StatCard emoji="🎹" label="Piano days" value={`${pianoDays}/7`} good={pianoDays>=5} color={c.color}/>
                  <StatCard emoji="📖" label="Reading days" value={`${readingDays}/7`} good={readingDays>=5} color={c.color}/>
                  <StatCard emoji="📅" label="Classes done" value={`${schedCompleted}/${schedTotal}`} good={schedCompleted===schedTotal} color={c.color}/>
                  <StatCard emoji="📷" label="Meal photos" value={`${uploadedMeals}/${totalMeals}`} good={uploadedMeals>=totalMeals*0.7} color={c.color}/>
                </div>

                {/* Reading log */}
                {readingLog.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={S.lbl}>📚 Reading Log This Week</div>
                    {readingLog.map((r,i)=>(
                      <div key={i} style={{background:"#f9fafb",borderRadius:10,padding:"9px 12px",marginBottom:6}}>
                        <div style={{fontSize:12,color:"#374151",fontWeight:600}}>{formatDate(r.date)} — {r.book}{r.mins?` (${r.mins} mins)`:""}</div>
                        {r.summary&&<div style={{fontSize:12,color:"#6b7280",marginTop:3,lineHeight:1.5}}>{r.summary}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes log */}
                {notesLog.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={S.lbl}>📝 Activity & Absence Notes</div>
                    {notesLog.map((n,i)=>(
                      <div key={i} style={{background:"#f9fafb",borderRadius:10,padding:"9px 12px",marginBottom:6}}>
                        <div style={{fontSize:11,color:"#9ca3af",fontWeight:700,marginBottom:4}}>{formatDate(n.date)}</div>
                        {n.extra&&<div style={{fontSize:12,color:"#374151",marginBottom:n.missed?4:0}}>🌟 <strong>Extra:</strong> {n.extra}</div>}
                        {n.missed&&<div style={{fontSize:12,color:"#6b7280"}}>❓ <strong>Missed:</strong> {n.missed}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{background:c.light,borderRadius:10,padding:"10px 12px",fontSize:13,color:c.accent,fontWeight:500}}>
                  {avgPct>=90?`🌟 ${c.name} had an outstanding week!`:
                   avgPct>=70?`👍 ${c.name} did well this week — keep it up!`:
                   avgPct>=50?`💪 ${c.name} has room to grow — let's do better!`:
                   `📢 ${c.name} needs more effort this week — Mum believes in you!`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({emoji,label,value,good,color}){
  return(
    <div style={{background:good?`${color}11`:"#f9fafb",borderRadius:10,padding:"10px 12px",border:`1px solid ${good?color+"33":"#f0f0f0"}`}}>
      <div style={{fontSize:18,marginBottom:4}}>{emoji}</div>
      <div style={{fontSize:20,fontWeight:700,color:good?color:"#374151"}}>{value}</div>
      <div style={{fontSize:11,color:"#9ca3af"}}>{label}</div>
    </div>
  );
}

const S={
  bg:{minHeight:"100vh",background:"#f5f4f1",fontFamily:"'Segoe UI','PingFang SC','Noto Sans SC',sans-serif"},
  lbl:{fontSize:11,fontWeight:700,color:"#9ca3af",letterSpacing:1,textTransform:"uppercase",marginBottom:6},
  backBtn:{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,padding:"4px 10px",color:"#fff",cursor:"pointer",fontSize:13},
};
