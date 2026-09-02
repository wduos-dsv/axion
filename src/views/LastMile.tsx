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
  const [shipmentOrderData, setShipmentOrderData] = useState<any[]>([]);
  const [pickDetailData, setPickDetailData] = useState<any[]>([]);

  const [pickDetailFilePath, setPickDetailFilePath] = useState("");

  const [printStatus, setPrintStatus] = useState<
    "none" | "success" | "error" | "awaiting"
  >("none");
  const [printStatusMessage, setPrintStatusMessage] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadShipmentOrderFile = async (file: any) => {
    if (!file) {
      setPickDetailFilePath("");
      return;
    }

    try {
      const filePath = file.path;
      if (!filePath) {
        throw new Error("Caminho do arquivo não encontrado.");
      }

      setPickDetailFilePath(file.path);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "get-waves-from-shipment-order",
        file.path,
      );

      if (result.success) {
        setShipmentOrderData(result.waves);

        console.log(result.waves);
      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(
        `Erro ao processar o arquivo do Shipment Order: ${error}`,
      );
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReadPickDetailFile = async (file: any) => {
    if (!file) {
      setPickDetailFilePath("");
      return;
    }

    try {
      const filePath = file.path;
      if (!filePath) {
        throw new Error("Caminho do arquivo não encontrado.");
      }

      setPickDetailFilePath(file.path);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).ipcRenderer.invoke(
        "get-data-from-pick-detail",
        file.path,
      );

      if (result.success) {
        setPickDetailData(result.fileData);

        result.fileData.forEach((row: any) => {
          const thisOrderNumber = row?.orderNumber || "";

          shipmentOrderData.forEach((shipmentRow: any) => {
            if (shipmentRow.orderNumber === thisOrderNumber) {
              console.log("here")
            }
          });

      } else {
        setPrintStatus("error");
        setPrintStatusMessage(`Erro! ${result.error}`);
      }
    } catch (error) {
      setPrintStatus("error");
      setPrintStatusMessage(
        `Erro ao processar o arquivo do Pick Detail: ${error}`,
      );
    }
  };

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
      <h2 className="view-title">Impressão de Rotas Last Mile</h2>
      <small className="view-subtitle">Arquivo do Shipment Order</small>
      <input
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) =>
          handleReadShipmentOrderFile(event.target.files?.[0])
        }
      />

      {shipmentOrderData.length > 0 && (
        <>
          <small className="view-subtitle">Arquivo do Pick Detail</small>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) =>
              handleReadPickDetailFile(event.target.files?.[0])
            }
          />
        </>
      )}

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
