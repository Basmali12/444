// ===== بيانات الرومات + أعضاء لكل روم =====
const roomsData = [
  {
    id:'r1',
    name:'تعارف شباب وبنات محترم',
    desc:'تعرف على ناس جدد بأدب واحترام ✨',
    type:'t3arof',
    icon:'t3arof',
    isLocked:false,
    online:14,
    members:['باسم','زهراء','علي','نور','حسين']
  },
  {
    id:'r2',
    name:'روم الألعاب والتحديات',
    desc:'تحديات، أسئلة، ضحك 🎮',
    type:'games',
    icon:'games',
    isLocked:true,
    online:7,
    members:['كرار','حسن','مريم','سجاد']
  },
  {
    id:'r3',
    name:'سوالف للصبح',
    desc:'جلسة سوالف وفضفضة ☕',
    type:'swalif',
    icon:'swalif',
    isLocked:false,
    online:9,
    members:['أبو أمير','سارة','معصومة']
  },
  {
    id:'r4',
    name:'غرفة صداقة حقيقية',
    desc:'صداقة بدون تمثيل 🤝',
    type:'friends',
    icon:'friends',
    isLocked:false,
    online:11,
    members:['محمد','زينب','حسن','زهراء']
  },
  {
    id:'r5',
    name:'إشعارات صاحب التطبيق',
    desc:'إعلانات مهمة للجميع 📢',
    type:'notify',
    icon:'notify',
    isLocked:true,
    online:3,
    members:['أبو أمير','حيدر','فاطمة']
  },
  {
    id:'r6',
    name:'ضحك ونكت وميمز',
    desc:'ضحك وتفاهة محترمة 😂',
    type:'funny',
    icon:'funny',
    isLocked:false,
    online:15,
    members:['نور','حسين','كرار','زهراء','علي']
  }
];

let currentFilter = 'all';
let micOn = false;
let currentRoom = null;

const roomsListEl      = document.getElementById('roomsList');
const roomsScreen      = document.getElementById('roomsScreen');
const roomInnerScreen  = document.getElementById('roomInnerScreen');

const innerRoomName = document.getElementById('innerRoomName');
const innerRoomSub  = document.getElementById('innerRoomSub');
const innerRoomMeta = document.getElementById('innerRoomMeta');
const statUsers     = document.getElementById('statUsers');
const micBtn        = document.getElementById('micBtn');

const topMicsRow    = document.getElementById('topMicsRow');
const bottomMicsRow = document.getElementById('bottomMicsRow');

const roomChatMessages = document.getElementById('roomChatMessages');
const roomChatInput    = document.getElementById('roomChatInput');
let roomChat = [];

let currentDMUser = null;

function handleBack(){
  // إذا كنت داخل الروم → رجع لقائمة الرومات
  if(roomInnerScreen.classList.contains('active')){
    leaveRoom();
  }else{
    // هنا تربط الرجوع للواجهة الرئيسية لتطبيقك
    // مثال مستقبلي: window.location.href = 'index.html';
    alert('هنا تربط زر الرجوع بالواجهة الرئيسية لتطبيقك');
  }
}

function iconClassFor(room){
  switch(room.icon){
    case 't3arof': return 'room-icon-circle room-icon-t3arof';
    case 'games':  return 'room-icon-circle room-icon-games';
    case 'swalif': return 'room-icon-circle room-icon-swalif';
    case 'friends':return 'room-icon-circle room-icon-friends';
    case 'notify': return 'room-icon-circle room-icon-notify';
    case 'funny':  return 'room-icon-circle room-icon-funny';
    default:       return 'room-icon-circle room-icon-swalif';
  }
}

function renderRooms(){
  roomsListEl.innerHTML = '';
  const filtered = roomsData.filter(r => currentFilter === 'all' ? true : r.type === currentFilter);

  filtered.forEach(room=>{
    const div = document.createElement('div');
    div.className = 'room-card';
    div.onclick = ()=>openRoom(room);

    const lockBadge = room.isLocked
      ? `<span class="badge badge-locked"><i class="fa-solid fa-lock"></i> برمز</span>`
      : `<span class="badge badge-public"><i class="fa-solid fa-lock-open"></i> عام</span>`;

    const members = room.members || [];
    const first3 = members.slice(0,3);
    const moreCount = members.length > 3 ? (members.length - 3) : 0;

    let membersHtml = '';
    first3.forEach(name=>{
      const initial = name.trim().charAt(0) || "?";
      membersHtml += `<div class="member-avatar">${initial}</div>`;
    });

    const moreHtml = moreCount > 0
      ? `<span class="member-more">+${moreCount} آخرين</span>`
      : '';

    div.innerHTML = `
      <div class="room-top-row">
        <div class="room-icon-wrap">
          <div class="${iconClassFor(room)}">
            ${
              room.type === 'games' ? '<i class="fa-solid fa-gamepad"></i>' :
              room.type === 'funny' ? '<i class="fa-solid fa-face-grin-squint-tears"></i>' :
              room.type === 'notify' ? '<i class="fa-solid fa-bullhorn"></i>' :
              room.type === 'friends'? '<i class="fa-solid fa-user-group"></i>' :
              room.type === 't3arof' ? '<i class="fa-solid fa-heart"></i>' :
                                        '<i class="fa-solid fa-microphone-lines"></i>'
            }
          </div>
        </div>
        <div class="room-main-info">
          <div class="room-name">${room.name}</div>
          <div class="room-desc">${room.desc}</div>
        </div>
        <div class="room-side-meta">
          <div><i class="fa-solid fa-user"></i> ${room.online} متواجد</div>
          ${lockBadge}
        </div>
      </div>

      <div class="room-members-row">
        <div class="members-avatars">
          ${membersHtml}
          ${moreHtml}
        </div>
        <div class="room-stats">
          <span><i class="fa-solid fa-volume-high"></i> صوتي فقط</span>
        </div>
      </div>
    `;
    roomsListEl.appendChild(div);
  });

  if(filtered.length === 0){
    roomsListEl.innerHTML = `
      <p style="font-size:12px;color:#9ca3af;margin-top:10px;text-align:center">
        لا توجد رومات مطابقة للتصفية الحالية.
      </p>
    `;
  }
}

function setFilter(btn){
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter || 'all';
  renderRooms();
}

// ===== بيانات شكلية للمايكات (5 فوق + 5 جوه) =====
const topSpeakers = [
  {name:"أبو أمير", mic:true},
  {name:"زينب",     mic:false},
  {name:"علي",      mic:true},
  {name:"سارة",     mic:false},
  {name:"كرار",     mic:true}
];
const bottomSpeakers = [
  {name:"نور",    mic:false},
  {name:"حسين",   mic:false},
  {name:"مرتضى",  mic:true},
  {name:"مريم",   mic:false},
  {name:"سجاد",   mic:true}
];

function renderMics(){
  topMicsRow.innerHTML = "";
  bottomMicsRow.innerHTML = "";

  topSpeakers.forEach(user=>{
    topMicsRow.appendChild(buildMicCard(user));
  });
  bottomSpeakers.forEach(user=>{
    bottomMicsRow.appendChild(buildMicCard(user));
  });
}

function buildMicCard(user){
  const card = document.createElement('div');
  card.className = 'mic-card';
  card.onclick = () => openUserDM(user);

  const avatar = document.createElement('div');
  avatar.className = 'mic-avatar';
  avatar.textContent = (user.name.trim()[0] || '?');

  const nameEl = document.createElement('div');
  nameEl.className = 'mic-name';
  nameEl.textContent = user.name;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'mic-icon' + (user.mic ? '' : ' mic-muted-icon');

  const icon = document.createElement('i');
  icon.className = 'fa-solid ' + (user.mic ? 'fa-microphone' : 'fa-microphone-slash');

  iconWrap.appendChild(icon);
  card.appendChild(avatar);
  card.appendChild(nameEl);
  card.appendChild(iconWrap);

  return card;
}

function openRoom(room){
  currentRoom = room;
  roomsScreen.classList.remove('active');
  roomInnerScreen.classList.add('active');

  innerRoomName.textContent = room.name;
  innerRoomSub.textContent  = room.desc;

  innerRoomMeta.innerHTML = room.isLocked
    ? `<i class="fa-solid fa-lock"></i> <span>روم خاص • برمز دخول</span>`
    : `<i class="fa-solid fa-lock-open"></i> <span>روم عام • بدون رمز</span>`;

  statUsers.textContent = room.online + " متواجد";

  micOn = false;
  updateMicUI();
  renderMics();

  // إعادة تعيين دردشة الروم (شكلية)
  roomChat = [
    {sender:'نظام', text:'أهلاً بك في الروم، هذه دردشة شكلية للتجربة.'}
  ];
  renderRoomChat();
}

function leaveRoom(){
  currentRoom = null;
  roomInnerScreen.classList.remove('active');
  roomsScreen.classList.add('active');
}

function toggleMic(){
  micOn = !micOn;
  updateMicUI();
}

function updateMicUI(){
  if(micOn){
    micBtn.classList.remove('mic-muted');
    micBtn.classList.add('mic-on');
    micBtn.innerHTML = `<i class="fa-solid fa-microphone"></i>`;
  }else{
    micBtn.classList.remove('mic-on');
    micBtn.classList.add('mic-muted');
    micBtn.innerHTML = `<i class="fa-solid fa-microphone-slash"></i>`;
  }
}

// ===== دردشة الروم (شكلية) =====
function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderRoomChat(){
  if(!roomChatMessages) return;
  roomChatMessages.innerHTML = '';
  roomChat.forEach(msg=>{
    const div = document.createElement('div');
    div.className = 'room-chat-message';
    div.innerHTML =
      `<strong style="color:#22c55e;">${escapeHtml(msg.sender)}:</strong> `+
      `<span>${escapeHtml(msg.text)}</span>`;
    roomChatMessages.appendChild(div);
  });
  roomChatMessages.scrollTop = roomChatMessages.scrollHeight;
}

function sendRoomChatMessage(){
  const text = roomChatInput.value.trim();
  if(!text) return;
  roomChat.push({sender:'أنا', text});
  roomChatInput.value = '';
  renderRoomChat();
}

roomChatInput.addEventListener('keypress', (e)=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    sendRoomChatMessage();
  }
});

// ===== مودال المراسلة الخاصة =====
const dmModal        = document.getElementById('dmModal');
const dmUserNameEl   = document.getElementById('dmUserName');
const dmMessageInput = document.getElementById('dmMessageInput');

function openUserDM(user){
  currentDMUser = user;
  dmUserNameEl.textContent = user.name;
  dmMessageInput.value = '';
  dmModal.style.display = 'flex';
}

function closeDM(){
  dmModal.style.display = 'none';
}

function sendDMMessage(){
  const text = dmMessageInput.value.trim();
  if(!text){
    alert('اكتب رسالة أولاً');
    return;
  }
  // هنا مستقبلاً تربط المراسلة الخاصة فعلياً
  alert('(تصميم فقط) سيتم لاحقاً إرسال رسالة خاصة إلى: ' + currentDMUser.name);
  closeDM();
}

// إغلاق المودال عند الضغط خارج الصندوق
dmModal.addEventListener('click', (e)=>{
  if(e.target === dmModal){
    closeDM();
  }
});

function createRoomPrompt(){
  const name = prompt("أكتب اسم للروم الصوتي الجديد:");
  if(!name || !name.trim()) return;
  const id = "custom_" + Date.now();
  roomsData.unshift({
    id,
    name:name.trim(),
    desc:"روم تم إنشاؤه من قبلك (تصميم فقط).",
    type:"swalif",
    icon:'swalif',
    isLocked:false,
    online:1,
    members:[name.trim(),"ضيف 1","ضيف 2"]
  });
  renderRooms();
  alert("تم إنشاء الروم شكلياً فقط. لاحقاً نربطه بصوت حقيقي.");
}

// تشغيل أولي
renderRooms();
