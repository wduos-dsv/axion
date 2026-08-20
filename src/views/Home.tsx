import banner from "../assets/windows.svg";

export default function Home() {
  return (
    <div
      className="Home"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      <img
        src={banner}
        alt="banner"
        style={{ height: "9rem", marginBottom: "var(--spacing-1)" }}
      />
      <p className="bold center">Processos administrativos facilitados</p>
      <ul
        className="center dim"
        style={{ margin: 0, padding: 0, listStyle: "none" }}
      >
        <li>
          <small>Escolha o processo na lista ao lado</small>
        </li>
        <li>
          <small>Siga os passos indicados pela interface</small>
        </li>
        <li>
          <small>Configure a impressora de destino, se necessário</small>
        </li>
        <li>
          <small>Imprima!</small>
        </li>
      </ul>
      <small
        className="watermark"
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          fontSize: ".7rem",
          opacity: 0.2,
          transform: "translateX(-50%)",
        }}
      >
        Desenvolvido por Wendel Duarte
      </small>
    </div>
  );
}
