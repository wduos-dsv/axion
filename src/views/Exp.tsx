import { useState } from "react";

interface printerInfo {
  printerPort: number;
  printerIP: string;
}

export default function Exp({ printerPort, printerIP }: printerInfo) {
  const [printMode, setPrintMode] = useState<"full" | "specific">("full");
  const [selectedMunicipality, setSelectedMunicipality] = useState<
    "Itajaí" | "Cachoeirinha" | "Passo Fundo"
  >("Itajaí");
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [orderNumber, setOrderNumber] = useState("");
  const [palletQuantity, setPalletQuantity] = useState(1);
  const [specificLabelToPrint, setSpecificLabelToPrint] = useState(1);
  const [printRepackLabel, setPrintRepackLabel] = useState(false);

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");

    const trimmedOrder = orderNumber.trim();
    if (!trimmedOrder.match(/^\d{10}$/)) {
      setPrintStatus("error");
      setPrintStatusMessage("O número da ordem precisa ter 10 dígitos.");
      return;
    }

    if (printMode === "full") {
      try {
        const config = {
          ip: printerIP,
          port: printerPort,
          municipality: selectedMunicipality,
          expDate: selectedDate.replace(/-/g, "/"),
          order: trimmedOrder,
          totalLabels: palletQuantity,
          repack: printRepackLabel ? "Sim" : "Não",
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (window as any).ipcRenderer.invoke(
          "print-exp-full-range",
          config,
        );
        if (result.success) {
          setPrintStatus("success");
          setPrintStatusMessage("Impressão concluída com sucesso!");
        } else {
          setPrintStatus("error");
          setPrintStatusMessage(`Erro! ${result.error}`);
        }
      } catch (error) {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro de comunicação: ${error}`);
      }
      return;
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        municipality: selectedMunicipality,
        expDate: selectedDate.replace(/-/g, "/"),
        order: trimmedOrder,
        totalLabels: palletQuantity,
        labelToPrint: specificLabelToPrint,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-exp-specific-label",
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
      <h2 className="view-title">Etiquetas EXP</h2>
      <small className="view-subtitle">modo</small>
      <div className="flex-btns">
        <button
          type="button"
          onClick={() => setPrintMode("full")}
          className={printMode === "full" ? "active" : ""}
        >
          Sequência Completa
        </button>
        <button
          type="button"
          onClick={() => setPrintMode("specific")}
          className={printMode === "specific" ? "active" : ""}
        >
          Etiqueta Específica
        </button>
      </div>
      <small className="view-subtitle">Município</small>
      <div className="flex-btns">
        <button
          type="button"
          onClick={() => setSelectedMunicipality("Itajaí")}
          className={selectedMunicipality === "Itajaí" ? "active" : ""}
        >
          Itajaí
        </button>
        <button
          type="button"
          onClick={() => setSelectedMunicipality("Cachoeirinha")}
          className={selectedMunicipality === "Cachoeirinha" ? "active" : ""}
        >
          Cachoeirinha
        </button>
        <button
          type="button"
          onClick={() => setSelectedMunicipality("Passo Fundo")}
          className={selectedMunicipality === "Passo Fundo" ? "active" : ""}
        >
          Passo Fundo
        </button>
      </div>
      <small className="view-subtitle">Data de Expedição</small>
      <input
        type="date"
        value={selectedDate}
        onChange={(event) => {
          setSelectedDate(event.target.value);
          console.log(event.target.value.replace(/-/g, "/"));
        }}
      />
      <small className="view-subtitle">Número da Ordem</small>
      <input
        type="number"
        placeholder="6878496221"
        value={orderNumber}
        min={6878000000}
        max={9999999999}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
          setOrderNumber(digits);
        }}
      />
      <small className="view-subtitle">Quantidade de Pallets</small>
      <input
        type="number"
        value={palletQuantity}
        max={30}
        onChange={(event) =>
          setPalletQuantity(parseInt(event.target.value) || 1)
        }
      />
      {printMode === "specific" && (
        <>
          <small className="view-subtitle">Etiqueta a ser impressa</small>
          <input
            type="number"
            value={specificLabelToPrint}
            max={palletQuantity}
            onChange={(event) =>
              setSpecificLabelToPrint(parseInt(event.target.value) || 1)
            }
          />
        </>
      )}
      {printMode === "full" && (
        <>
          <small className="view-subtitle">Imprimir etiqueta de Repack</small>
          <div className="flex-btns">
            <button
              type="button"
              onClick={() => setPrintRepackLabel(true)}
              className={printRepackLabel ? "active" : ""}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setPrintRepackLabel(false)}
              className={printRepackLabel ? "" : "active"}
            >
              Não
            </button>
          </div>
        </>
      )}

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
