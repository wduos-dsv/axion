import "./Modal.css";

interface ModalProps {
  show: boolean;
}

export default function Modal({ show }: ModalProps) {
  return (
    <>
      <div className="Modal" style={{ display: show ? "block" : "none" }}>
        <div className="status-bar success"></div>
      </div>
      <div className="modal-mask"></div>
    </>
  );
}
