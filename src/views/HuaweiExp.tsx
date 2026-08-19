import { useState } from "react";

interface printerInfo {
  printerPort: number;
  printerIP: string;
}

export default function HuaweiExp({ printerPort, printerIP }: printerInfo) {
  const [destination, setDestination] = useState("");
  const [nfNumber, setNfNumber] = useState(1);
  const [packingList, setPackingList] = useState("");
  const [totalLabels, setTotalLabels] = useState(1);

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        destination,
        nfNumber,
        packingList,
        totalLabels,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-huawei-exp-label",
        config,
      );
      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage("Impressão concluída com sucesso!");
      } else {
        setPrintStatus("error");
        setPrintStatusMessage("Erro! " + result.error);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(`Erro de impressão: ${error}`);
      console.error("Erro na comunicação de impressão:", error);
    }
  };

  return (
    <div>
      <h2 className="view-title">Etiquetas de Expedição Huawei</h2>
      <small className="view-subtitle">Destino</small>
      <input
        type="text"
        placeholder="Cidade - UF"
        value={destination}
        onChange={(e) => {
          setDestination(e.target.value);
        }}
      />
      <small className="view-subtitle">Nota Fiscal</small>
      <input
        type="number"
        value={nfNumber}
        min={1}
        max={9999}
        onChange={(event) => setNfNumber(parseInt(event.target.value) || 1)}
      />
      <small className="view-subtitle">Pedido / Packing List</small>
      <input
        type="text"
        placeholder="SD-BRJOI-0000000000"
        value={packingList}
        onChange={(e) => {
          setPackingList(e.target.value);
        }}
      />
      <small className="view-subtitle">Quantidade de Volumes</small>
      <input
        type="number"
        value={totalLabels}
        max={99}
        onChange={(event) => setTotalLabels(parseInt(event.target.value) || 1)}
      />

      <button
        className={
          printStatus === "awaiting"
            ? "print-labels-btn disabled"
            : "print-labels-btn"
        }
        onClick={handlePrint}
        disabled={printStatus === "awaiting"}
      >
        Iniciar Impressão
      </button>
      {printStatus === "success" ? (
        <small className="mrg-top-3 text-xs center green">
          {printStatusMessage}
        </small>
      ) : printStatus === "error" ? (
        <small className="mrg-top-3 text-xs center err">
          {printStatusMessage}
        </small>
      ) : printStatus === "awaiting" ? (
        <small className="mrg-top-3 text-xs center dim hold">Aguarde...</small>
      ) : null}
    </div>
  );
}
