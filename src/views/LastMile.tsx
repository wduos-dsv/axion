import { useState } from "react";

interface PrinterInfo {
  printerPort: number;
  printerIP: string;
}

export default function LastMile({ printerPort, printerIP }: PrinterInfo) {
  const [routeNumber, setRouteNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState<number>();
  const [customerName, setCustomerName] = useState("");
  const [qrDataString, setQrDataString] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [location, setLocation] = useState("");
  const [sequence, setSequence] = useState("001");
  const [trackNumber, setTrackNumber] = useState<number>(1);
  const [packType, setPackType] = useState("");
  const [thisVolume, setThisVolume] = useState<number>(1);
  const [totalVolumes, setTotalVolumes] = useState<number>(1);
  const [shipNumber, setShipNumber] = useState("");
  const [rt, setRt] = useState("");

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  const handlePrint = async () => {
    setPrintStatus("awaiting");

    if (
      !routeNumber ||
      !orderNumber ||
      !customerName ||
      !qrDataString ||
      !location ||
      !packType ||
      !shipNumber ||
      !rt
    ) {
      setPrintStatus("error");
      setPrintStatusMessage("Preencha todos os campos!");
      return;
    }

    try {
      const config = {
        ip: printerIP,
        port: printerPort,
        trackNumber,
        packType,
        thisVolume,
        totalVolumes,
        sequence,
        qrDataString,
        deliveryDate: `${deliveryDate.replace(/-/g, "/")} 08:00 AM`,
        routeNumber,
        orderNumber,
        location,
        customerName,
        shipNumber,
        rt,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "print-last-mile-label",
        config,
      );

      if (result.success) {
        setPrintStatus("success");
        setPrintStatusMessage(`Impressão enviada com sucesso!`);
      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(`Erro de comunicação: ${error}`);
    }
  };

  return (
    <div>
      <h2 className="view-title">Etiqueta de Last Mile</h2>
      <div className="flex-wrapper">
        <small className="view-subtitle">Número da Rota</small>
        <small className="view-subtitle">Número da Ordem</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="text"
          placeholder="BR0551280"
          value={routeNumber}
          onChange={(e) => {
            const text = e.target.value.slice(0, 10).toUpperCase();
            setRouteNumber(text);
          }}
        />
        <input
          type="number"
          placeholder="687812345"
          min={687800000}
          max={999999999}
          value={orderNumber}
          onChange={(e) => {
            const digits = parseInt(
              e.target.value.replace(/\D/g, "").slice(0, 10),
            );
            setOrderNumber(digits);
          }}
        />
      </div>

      <div className="flex-wrapper">
        <small className="view-subtitle">Cliente</small>
        <small className="view-subtitle">QR Code</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="text"
          placeholder="MERCADO JOÃO DA SILVA"
          value={customerName}
          onChange={(e) => {
            const text = e.target.value.slice(0, 35).toUpperCase();
            setCustomerName(text);
          }}
        />
        <input
          type="text"
          inputMode="numeric"
          placeholder="6878837610:0000143420"
          value={qrDataString}
          onChange={(e) => {
            const text = e.target.value.replace(/[^0-9:]/g, "").slice(0, 21);
            setQrDataString(text);
          }}
        />
      </div>

      <div className="flex-wrapper">
        <small className="view-subtitle">Data de Entrega</small>
        <small className="view-subtitle">Local de Entrega</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="date"
          value={deliveryDate}
          onChange={(event) => {
            const date = event.target.value;
            console.log(date.replace(/-/g, "/"));
            setDeliveryDate(date);
          }}
        />
        <input
          type="text"
          placeholder="ARAQUARI - SC"
          value={location}
          onChange={(e) => {
            const text = e.target.value.slice(0, 20).toUpperCase();
            setLocation(text);
          }}
        />
      </div>

      <div className="flex-wrapper">
        <small className="view-subtitle">NF Seq</small>
        <small className="view-subtitle">Esteira</small>
        <small className="view-subtitle">Embalagem</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="number"
          placeholder="1"
          min={1}
          max={999}
          value={sequence}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
            const threeDigitSequence = digits.padStart(3, "0");
            setSequence(threeDigitSequence);
          }}
        />
        <input
          type="number"
          placeholder="1"
          min={1}
          max={9}
          value={trackNumber}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 1);
            setTrackNumber(parseInt(digits));
          }}
        />
        <input
          type="text"
          placeholder="5M"
          value={packType}
          onChange={(e) => {
            const text = e.target.value.slice(0, 5).toUpperCase();
            setPackType(text);
          }}
        />
      </div>

      <div className="flex-wrapper">
        <small className="view-subtitle">Volume</small>
        <small className="view-subtitle">Total de Volumes</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="text"
          placeholder="1"
          min={1}
          max={totalVolumes || 99}
          value={thisVolume}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
            setThisVolume(parseInt(digits) || 1);
          }}
        />
        <input
          type="number"
          placeholder="1"
          min={thisVolume}
          max={99}
          value={totalVolumes}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
            setTotalVolumes(parseInt(digits) || 1);
          }}
        />
      </div>

      <div className="flex-wrapper">
        <small className="view-subtitle">Ship</small>
        <small className="view-subtitle">RT</small>
      </div>
      <div className="flex-wrapper">
        <input
          type="number"
          inputMode="numeric"
          placeholder="0006534485"
          min={10}
          max={10}
          value={shipNumber}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
            setShipNumber(digits);
          }}
        />
        <input
          type="text"
          placeholder="EX07"
          min={4}
          max={4}
          value={rt}
          onChange={(e) => {
            const digits = e.target.value.slice(0, 4).toUpperCase();
            setRt(digits);
          }}
        />
      </div>

      <button
        className={
          printStatus === "awaiting"
            ? "main-process-btn disabled"
            : "main-process-btn"
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
