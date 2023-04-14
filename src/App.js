import './App.css';

import io from 'socket.io-client'
// import { Peer } from 'peerjs'
import { useEffect, useRef, useState } from 'react';

const conn = io('ws://192.168.18.160:3010', {
  transports: ['websocket'],
  autoConnect: false,
});
const config = {
  configuration: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
  },
  iceServers: []
}
const RTC_Connection = new RTCPeerConnection(config)
// const peer = new Peer('', {
//   host: '192.168.18.160',
//   port: 3020,s
//   path: '/peer',s
//   secure: false,
//   config: {
//     iceServers: [],
//   },
// });

function App() {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [users, setUsers] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  //   const [remotePeerID, setRemotePeerID] = useState(null)
  const localVidRef = useRef(null)
  const remoteVidRef = useRef(null)
  //   conn.on('connect_error', err => {
  //     console.log('socket error', err.message);
  //   });
  //   const peerId = peer.id
  useEffect(() => {
    conn.connect();
    conn.on('id connected', (id) => {
      setUsers([...id])
    })
    // if (peerId) {
    //   conn.emit('peerID', peerId)
    // }
    // conn.on('webrtc', (data) => {
    //   // eslint-disable-next-line array-callback-return
    //   const remoteId = data.filter((peerid) => { if (peerId) { return peerid !== peerId.toString() } })
    //   if (remoteId.length > 0) {
    //     setRemotePeerID(remoteId[0])
    //   }
    // })
  }, [users])

  useEffect(() => {
    console.log('total users before filter', users)
    if (users.length > 0) {
      console.log(users, 'users')
      console.log('socket id', conn.id)
      const other = users.filter((data) => data !== conn.id)
      if (other.length > 0) {
        setOtherUser(other[0])
      }
    }
  }, [users])

  async function getStream() {
    const offer = await RTC_Connection.createOffer()
    await RTC_Connection.setLocalDescription(offer)
    conn.emit('sendOffer', { data: { local: RTC_Connection.localDescription, other: otherUser } })
  }

  async function init() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    setLocalStream(stream)
    localVidRef.current.srcObject = stream
    stream.getTracks().forEach((tracks) => {
      RTC_Connection.addTrack(tracks, stream)
    })
    RTC_Connection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('local candidate', event.candidate)
        conn.emit('candidate', { candidate: event.candidate, other: otherUser })
      }
    }
  }

  useEffect(() => {
    console.log('other user', otherUser)
    if (otherUser) {
      console.log(1)
      conn.on('receiveOffer', async (data) => {
        console.log('rec off', data)
        await RTC_Connection.setRemoteDescription(new RTCSessionDescription(data))
        const answer = await RTC_Connection.createAnswer()
        await RTC_Connection.setLocalDescription(answer)
        conn.emit('sendAnswer', { answer: RTC_Connection.localDescription, other: otherUser })
      })
      conn.on('receiveCandidate', (data) => {
        console.log('recee Candi', data)
        RTC_Connection.addIceCandidate(new RTCIceCandidate(data))
      })
      conn.on('receiveAnswer', (data) => {
        console.log('rece Answer', data)
        RTC_Connection.setRemoteDescription(new RTCSessionDescription(data))
      })
    }
  }, [otherUser])

  useEffect(() => {
    RTC_Connection.ontrack = (event) => {
      console.log('event track from peer', event)
      remoteVidRef.current.srcObject = event.streams[0]
      setRemoteStream(event.streams[0])
    }
  })

  //   if (localStream && remotePeerID) {
  //     console.log('connecting with remote id')
  //     const callPeer = peer.call(remotePeerID, localStream)
  //     console.log(callPeer)
  //     callPeer.on('stream', (stream) => {
  //       console.log('stream calling', stream)
  //     })
  //   }

  //   if (localStream) {
  //     peer.on('call', (call) => {
  //       call.answer(localStream)
  //       call.on('stream', (stream) => {
  //         console.log('receving streeam', stream)
  //         remoteVidRef.current.srcObject = stream
  //       })
  //     })
  // }

  return (
    <div className="App">
      <h1>Hello World</h1>
      {
        users.length > 0 && <button onClick={init}>Make a RTC Connection</button>
      }
      {
        users.length > 0 && <button onClick={getStream}>Connect a RTC Connection</button>
      }
      <h2>Other User is here {otherUser}</h2>
      {
        localVidRef && <video ref={localVidRef} autoPlay={true}></video>
      }
      <h2>Remote Ref</h2>
      {
        remoteVidRef && <video ref={remoteVidRef} autoPlay={true}></video>
      }
    </div>
  );
}

export default App;
