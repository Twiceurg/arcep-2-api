let ioInstance;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  if (!ioInstance) {
    throw new Error("Socket.io n'est pas encore initialisé.");
  }
  return ioInstance;
}

module.exports = {
  setIo,
  getIo,
};
