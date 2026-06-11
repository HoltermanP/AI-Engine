'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CalculatieResult } from '@/lib/calculatie/types';
import { generateCalculatieAction, uploadBestekAction } from '@/lib/actions/calculatie';
import { downloadBase64 } from '@/lib/export/download';
import { Calculator, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

interface CalculatiePanelProps {
  traceId: string;
  disabled?: boolean;
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
}

export function CalculatiePanel({ traceId, disabled }: CalculatiePanelProps) {
  const [calculatie, setCalculatie] = useState<CalculatieResult | null>(null);
  const [excelBase64, setExcelBase64] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [prijsBron, setPrijsBron] = useState<string | null>(null);
  const [bestekNaam, setBestekNaam] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bestekInputRef = useRef<HTMLInputElement>(null);
  const projectIdRef = useRef<string | null>(null);

  function handleCalculeren() {
    startTransition(async () => {
      const res = await generateCalculatieAction(traceId);
      setCalculatie(res.calculatie);
      setExcelBase64(res.excelBase64);
      setFilename(res.filename);
      setPrijsBron(res.prijsBron.toelichting);
      projectIdRef.current = res.calculatie.projectId;
    });
  }

  function handleBestekFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        // ProjectId via een eerste (stille) calculatie als die nog onbekend is
        if (!projectIdRef.current) {
          const res = await generateCalculatieAction(traceId);
          projectIdRef.current = res.calculatie.projectId;
        }
        const result = await uploadBestekAction(
          projectIdRef.current!,
          file.name,
          String(reader.result ?? '')
        );
        if (result.ok) {
          setBestekNaam(file.name);
          setPrijsBron(result.melding);
        } else {
          setPrijsBron(result.melding);
        }
      });
    };
    reader.readAsText(file);
  }

  function handleDownload() {
    if (!excelBase64 || !filename) return;
    downloadBase64(
      excelBase64,
      filename,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Calculatie</p>
            <p className="text-xs text-muted-foreground">
              {bestekNaam
                ? `Bestek "${bestekNaam}" is leidend voor de prijzen`
                : 'Zonder bestek prijst AI op basis van de beschikbare informatie'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={bestekInputRef}
            type="file"
            accept=".txt,.csv,.md,.json,text/plain"
            className="hidden"
            onChange={handleBestekFile}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => bestekInputRef.current?.click()}
            disabled={isPending}
          >
            <Upload className="mr-1 h-3 w-3" /> {bestekNaam ? 'Bestek vervangen' : 'Bestek invoegen'}
          </Button>
          {excelBase64 && (
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="mr-1 h-3 w-3" /> Excel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleCalculeren}
            disabled={disabled || isPending}
            className="bg-emerald-600 hover:bg-emerald-600/90"
          >
            {isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Calculator className="mr-1 h-3 w-3" />
            )}
            Calculeren
          </Button>
        </div>
      </div>

      {prijsBron && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-800">{prijsBron}</p>
      )}

      {calculatie && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Subtotaal posten</p>
                <p className="text-lg font-semibold">{formatEuro(calculatie.samenvatting.subtotaal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Totaal excl. BTW</p>
                <p className="text-lg font-semibold">{formatEuro(calculatie.samenvatting.totaalExclBtw)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">BTW 21%</p>
                <p className="text-lg font-semibold">{formatEuro(calculatie.samenvatting.btw)}</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Totaal incl. BTW</p>
                <p className="text-lg font-bold text-emerald-800">
                  {formatEuro(calculatie.samenvatting.totaalInclBtw)}
                </p>
              </CardContent>
            </Card>
          </div>

          {calculatie.hoofdgroepen.map((groep) => (
            <Card key={groep.code}>
              <CardHeader className="flex-row items-center justify-between p-3 pb-1">
                <CardTitle className="text-sm">
                  {groep.code} {groep.naam}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {formatEuro(groep.subtotaal)}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 text-[10px]">Post</TableHead>
                      <TableHead className="h-8 text-[10px]">Omschrijving</TableHead>
                      <TableHead className="h-8 text-[10px]">Ehd</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Aantal</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Prijs</TableHead>
                      <TableHead className="h-8 text-right text-[10px]">Totaal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groep.regels.map((r) => (
                      <TableRow key={r.postnummer}>
                        <TableCell className="py-1.5 font-mono text-[10px]">{r.postnummer}</TableCell>
                        <TableCell className="py-1.5 text-xs">{r.omschrijving}</TableCell>
                        <TableCell className="py-1.5 text-[10px] text-muted-foreground">{r.eenheid}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[10px]">{r.hoeveelheid}</TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[10px]">
                          {formatEuro(r.eenheidsprijs)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right font-mono text-[10px] font-medium">
                          {formatEuro(r.totaal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          <p className="text-[10px] text-muted-foreground">
            Concept-calculatie met fictieve eenheidsprijzen. Definitieve prijzen via inkoop / RAW-bestek.
          </p>
        </div>
      )}
    </div>
  );
}
