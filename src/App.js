import React, { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";

const App = () => {
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const socketRef = useRef();

  useEffect(() => {
    // Set up WebSocket connection to signaling server
    socketRef.current = new WebSocket("ws://localhost:8765");

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "offer") {
        createAnswer(data.offer);
      } else if (data.type === "answer") {
        peer.signal(data.answer);
      } else if (data.type === "candidate") {
        peer.signal(data.candidate);
      }
    };

    // Set up user media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        setStream(mediaStream);
        localVideoRef.current.srcObject = mediaStream;

        const newPeer = new SimplePeer({
          initiator: true,
          trickle: false,
          stream: mediaStream
        });

        newPeer.on("signal", (signalData) => {
          if (signalData.type === "offer") {
            sendMessage({ type: "offer", offer: signalData });
          } else if (signalData.type === "answer") {
            sendMessage({ type: "answer", answer: signalData });
          } else if (signalData.candidate) {
            sendMessage({ type: "candidate", candidate: signalData });
          }
        });

        newPeer.on("stream", (remoteStream) => {
          remoteVideoRef.current.srcObject = remoteStream;
        });

        setPeer(newPeer);
      })
      .catch(console.error);

    return () => {
      socketRef.current.close();
    };
  }, []);

  const sendMessage = (message) => {
    socketRef.current.send(JSON.stringify(message));
  };

  const createAnswer = (offer) => {
    const newPeer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    newPeer.on("signal", (signalData) => {
      sendMessage({ type: "answer", answer: signalData });
    });

    newPeer.on("stream", (remoteStream) => {
      remoteVideoRef.current.srcObject = remoteStream;
    });

    newPeer.signal(offer);
    setPeer(newPeer);
  };

  return (
    <div>
      <h1>WebRTC Live Streaming</h1>
      <div>
        <video ref={localVideoRef} autoPlay muted playsInline />
        <video ref={remoteVideoRef} autoPlay playsInline />
      </div>
    </div>
  );
};

export default App;
