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
let screenStream;
let myName = prompt("Please enter your name:") || "User";

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  myPeer.on('call', call => {
    call.answer(myVideoStream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  socket.on('user-connected', (userId, userName) => {
    setTimeout(() => {
      connectToNewUser(userId, myVideoStream);
    }, 1000); // Give peer server time
    appendMessage(`<em>${userName} joined the room</em>`);
  });

  // chat functionality
  let text = document.getElementById("chat_message");

  text.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && text.value.length !== 0) {
      socket.emit('message', text.value, myName);
      text.value = '';
    }
  });

  socket.on("createMessage", (message, senderName) => {
    let ul = document.querySelector('.messages');
    let li = document.createElement('li');
    li.innerHTML = `<strong>${senderName}</strong>${message}`;
    ul.append(li);
    scrollToBottom();
  });
});

socket.on('user-disconnected', (userId, userName) => {
  if (peers[userId]) peers[userId].close();
  appendMessage(`<em>${userName} left the room</em>`);
});

myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id, myName);
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

const shareScreen = async () => {
  try {
    if (!screenStream) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      let videoTrack = screenStream.getVideoTracks()[0];

      videoTrack.onended = () => {
        stopScreenShare();
      };

      for (let userId in peers) {
        let sender = peers[userId].peerConnection.getSenders().find(s => s.track.kind == videoTrack.kind);
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }

      // Update local video
      myVideo.srcObject = screenStream;
    } else {
      stopScreenShare();
    }
  } catch (error) {
    console.error("Error sharing screen: ", error);
  }
}

const stopScreenShare = () => {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;

    let videoTrack = myVideoStream.getVideoTracks()[0];
    for (let userId in peers) {
      let sender = peers[userId].peerConnection.getSenders().find(s => s.track.kind == videoTrack.kind);
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    }

    // Revert local video
    myVideo.srcObject = myVideoStream;
  }
}

const leaveMeeting = () => {
  socket.disconnect();
  myPeer.destroy();
  document.body.innerHTML = "<h1 style='text-align:center; margin-top:20%; color:white;'>You left the meeting.</h1>";
}

function appendMessage(htmlContent) {
  let ul = document.querySelector('.messages');
  let li = document.createElement('li');
  li.innerHTML = htmlContent;
  ul.append(li);
  scrollToBottom();
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
