
/**
 * Converts an array of objects to a CSV string and triggers a browser download.
 * @param data Array of objects to export
 * @param filename Name of the file to download (without extension)
 */
export const downloadToExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName];
        // Handle strings with commas by wrapping in quotes
        // Handle dates or specific object types if necessary
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  // Create Blob and Link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Captures a Recharts SVG container and downloads it as a PNG image.
 * @param elementId The DOM ID of the container wrapping the chart
 * @param filename The desired filename for the downloaded image
 */
export const downloadChartAsPng = (elementId: string, filename: string) => {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`Element with id ${elementId} not found`);
        return;
    }
  
    const svg = container.querySelector('svg');
    if (!svg) {
      console.warn("Chart SVG not found within the container.");
      return;
    }
  
    // 1. Serialize SVG to String
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
  
    // 2. Add XML namespaces if missing (required for standalone usage)
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+xmlns:xlink/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
  
    // 3. Create a Canvas to draw the SVG
    const canvas = document.createElement('canvas');
    // Get actual dimensions
    const rect = svg.getBoundingClientRect();
    // Use 2x scale for better resolution (Retina-like quality)
    const scaleFactor = 2;
    canvas.width = rect.width * scaleFactor;
    canvas.height = rect.height * scaleFactor;
  
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    // 4. Fill White Background (Chart SVGs are often transparent)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 5. Draw Image
    ctx.scale(scaleFactor, scaleFactor);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      try {
          const pngUrl = canvas.toDataURL('image/png');
          
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `${filename}_Chart.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
      } catch (e) {
          console.error("Error generating PNG:", e);
      }
    };
    
    // Load source
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  };
