/**
 * DWG-conversie — alleen de interface.
 *
 * DXF → DWG-conversie vereist een licentie-afhankelijke library of service
 * (bijv. ODA/Teigha File Converter of Autodesk APS). Die is bewust niet
 * meegeleverd; deze module definieert alleen het koppelvlak. Een externe
 * conversieservice kan via de env-var `DWG_CONVERTER_URL` worden
 * geconfigureerd (HTTP POST met de DXF-inhoud, antwoord = DWG-binary).
 */

/** Converteert een DXF-string naar een DWG-binary. */
export interface DwgConverter {
  convert(dxf: string): Promise<Uint8Array>;
}

/**
 * Geeft een fetch-gebaseerde {@link DwgConverter} terug als
 * `DWG_CONVERTER_URL` is geconfigureerd, anders `null`.
 *
 * De service-URL moet een POST met `application/dxf`-body accepteren en de
 * DWG als binaire response teruggeven.
 */
export function getConfiguredDwgConverter(): DwgConverter | null {
  const url = process.env.DWG_CONVERTER_URL;
  if (!url) return null;

  return {
    async convert(dxf: string): Promise<Uint8Array> {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/dxf' },
        body: dxf,
      });
      if (!response.ok) {
        throw new Error(`DWG-conversie mislukt: ${response.status} ${response.statusText}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}
