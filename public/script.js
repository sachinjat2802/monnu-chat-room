const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myPeer = new Peer(undefined, {
  path: '/peerjs',
  host: '/',
  port: '3030'
});

const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

let myVideoStream;
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', userId => {
    setTimeout(() => {
      connectToNewUser(userId, stream);
    }, 1000); // Give peer server time
  });

  // chat functionality
  let text = document.getElementById("chat_message");

  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && text.value.length !== 0) {
      socket.emit('message', text.value);
      text.value = '';
    }
  });

  socket.on("createMessage", message => {
    let ul = document.querySelector('.messages');
    let li = document.createElement('li');
    li.innerHTML = `<strong>User</strong>${message}`;
    ul.append(li);
    scrollToBottom();
  })
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
  adjustGrid();
}

function adjustGrid() {
  const videos = videoGrid.querySelectorAll('video');
  const count = videos.length;
  if(count === 1) {
      videos.forEach(v => { v.style.width = '100%'; v.style.height = '100%'; });
  } else if (count === 2) {
      videos.forEach(v => { v.style.width = '49%'; v.style.height = '100%'; });
  } else if (count === 3 || count === 4) {
      videos.forEach(v => { v.style.width = '49%'; v.style.height = '49%'; });
  } else {
      videos.forEach(v => { v.style.width = '32%'; v.style.height = '32%'; });
  }
}

const scrollToBottom = () => {
  let d = document.querySelector('.main__chat_window');
  d.scrollTop = d.scrollHeight;
}

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
}

const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `
  document.querySelector('.main__mute_button').innerHTML = html;
}

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `
  document.querySelector('.main__video_button').innerHTML = html;
}
