"use client";
import React, { useEffect, useState } from "react";
import {
  createViewState,
  JBrowseLinearGenomeView,
} from "@jbrowse/react-linear-genome-view";
import { Card, CardHeader, CardContent, CardTitle } from "@v1/ui/card";
import { ScrollArea } from "@v1/ui/scroll-area";
import { Badge } from "@v1/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@v1/ui/tooltip";
import { env } from "@/env.mjs";

interface Variant {
  chromosome: string;
  position: number;
  reference: string;
  alternate: string;
  gene: string;
  consequence: string;
  significance: string;
}

const significanceColors = {
  Pathogenic: "bg-red-500",
  "Likely pathogenic": "bg-orange-500",
  "Uncertain significance": "bg-yellow-500",
  Benign: "bg-green-500",
};

const consequenceIcons: { [key: string]: string } = {
  missense_variant: "🔄",
  frameshift_variant: "⏭️",
  stop_gained: "🛑",
  splice_donor_variant: "✂️",
};

const VariantCard: React.FC<{ variant: Variant }> = ({ variant }) => {
  return (
    <div className="p-3 border rounded-lg shadow-sm">
      <h4 className="text-sm font-semibold mb-1">{variant.gene}</h4>
      <p className="text-xs mb-1">
        {variant.chromosome}:{variant.position} {variant.reference} →{" "}
        {variant.alternate}
      </p>
      <div className="flex flex-wrap gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="text-[10px] px-1">
                <span className="mr-1">
                  {consequenceIcons[variant.consequence] || "❓"}
                </span>
                {variant.consequence.replace("_", " ")}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{variant.consequence}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Badge
          className={`text-[10px] px-1 ${significanceColors[variant.significance] || "bg-gray-500"} text-white`}
        >
          {variant.significance}
        </Badge>
      </div>
    </div>
  );
};

export const GenomeAnalyser: React.FC = () => {
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_HUMAN_DEBUG_BACKEND_API_URL}/variants`);
        const data = await response.json();
        setVariants(data);
      } catch (error) {
        console.error("Error fetching variants:", error);
      }
    };

    fetchVariants();
  }, []);

  const assembly = {
    name: "GRCh38",
    sequence: {
      type: "ReferenceSequenceTrack",
      trackId: "GRCh38-ReferenceSequenceTrack",
      adapter: {
        type: "BgzipFastaAdapter",
        fastaLocation: {
          uri: "https://s3.amazonaws.com/jbrowse.org/genomes/GRCh38/fasta/GRCh38.fa.gz",
        },
        faiLocation: {
          uri: "https://s3.amazonaws.com/jbrowse.org/genomes/GRCh38/fasta/GRCh38.fa.gz.fai",
        },
        gziLocation: {
          uri: "https://s3.amazonaws.com/jbrowse.org/genomes/GRCh38/fasta/GRCh38.fa.gz.gzi",
        },
      },
    },
    aliases: ["hg38"],
    refNameAliases: {
      adapter: {
        type: "RefNameAliasAdapter",
        location: {
          uri: "https://s3.amazonaws.com/jbrowse.org/genomes/GRCh38/hg38_aliases.txt",
        },
      },
    },
  };

  const tracks = [
    {
      type: "VariantTrack",
      trackId: "1000genomes_variants",
      name: "1000 Genomes Variants",
      assemblyNames: ["GRCh38"],
      adapter: {
        type: "VcfTabixAdapter",
        vcfGzLocation: {
          uri: "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz",
        },
        index: {
          location: {
            uri: "https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz.tbi",
          },
        },
      },
    },
  ];

  const state = createViewState({
    assembly,
    tracks,
    location: "17:43,044,295..43,125,482", // BRCA1 location
  });

  // Highlight BRCA1 and BRCA2 regions
  const highlightedRegions = [
    {
      assemblyName: "GRCh38",
      refName: "17",
      start: 43044295,
      end: 43125482,
      reversed: false,
    },
    {
      assemblyName: "GRCh38",
      refName: "13",
      start: 32315474,
      end: 32400266,
      reversed: false,
    },
  ];
  state.session.view.setHighlight(highlightedRegions);

  const groupedVariants = variants.reduce(
    (acc, variant) => {
      const group = acc[variant.significance] || [];
      group.push(variant);
      acc[variant.significance] = group;
      return acc;
    },
    {} as Record<string, Variant[]>,
  );

  const orderedCategories = [
    "Pathogenic",
    "Likely pathogenic",
    "Uncertain significance",
    "Likely benign",
    "Benign",
  ];

  return (
    <div className="p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Genome Browser</CardTitle>
        </CardHeader>
        <CardContent>
          <JBrowseLinearGenomeView viewState={state} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Identified Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[700px] w-full">
            {orderedCategories.map(
              (category) =>
                groupedVariants[category] &&
                groupedVariants[category].length > 0 && (
                  <div key={category} className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {groupedVariants[category].map((variant, index) => (
                        <VariantCard key={index} variant={variant} />
                      ))}
                    </div>
                  </div>
                ),
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
