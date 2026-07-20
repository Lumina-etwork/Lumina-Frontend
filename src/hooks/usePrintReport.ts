import { useState, useCallback } from 'react';
import { renderCanvasToImage } from '../lib/print/renderCanvasToImage';
import { splitReportIntoVolumes, type ReportData, type ReportVolume } from '../utils/printHelpers';

export function usePrintReport() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [volumes, setVolumes] = useState<ReportVolume[]>([]);
  const [activeVolumeToPrint, setActiveVolumeToPrint] = useState<ReportVolume | null>(null);

  const printVolume = useCallback(async (
    reportData: ReportData,
    volumeNumber: number,
    containerId: string
  ) => {
    setIsPrinting(true);
    
    // Split into volumes
    const calculatedVolumes = splitReportIntoVolumes(reportData);
    setVolumes(calculatedVolumes);
    
    const targetVolume = calculatedVolumes.find(v => v.volumeNumber === volumeNumber) || calculatedVolumes[0];
    setActiveVolumeToPrint(targetVolume);

    // Give React time to render the hidden print container with the target volume data
    await new Promise((resolve) => setTimeout(resolve, 500));

    const container = document.getElementById(containerId);
    if (container) {
      // Rasterize all canvas charts
      await renderCanvasToImage(container);

      // Trigger standard print dialog
      window.print();
    } else {
      console.error(`Print container with ID "${containerId}" not found.`);
    }

    setIsPrinting(false);
    setActiveVolumeToPrint(null);
  }, []);

  return {
    printVolume,
    isPrinting,
    volumes,
    activeVolumeToPrint,
  };
}
