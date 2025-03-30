export interface Gene {
  name: string;
  value: number;
  mutationRate: number;
}

export interface GeneDefinition {
  name: string;
  defaultValue: number;
  defaultMutationRate: number;
  description: string;
  minValue?: number;
  maxValue?: number;
}

export class DNA {
  private genes: Map<string, Gene>;
  
  constructor(initialGenes?: Gene[]) {
    this.genes = new Map();
    
    if (initialGenes) {
      initialGenes.forEach(gene => {
        this.genes.set(gene.name, gene);
      });
    }
  }
  
  addGene(gene: Gene): void {
    this.genes.set(gene.name, gene);
  }
  
  getGene(name: string): Gene | undefined {
    return this.genes.get(name);
  }
  
  getAllGenes(): Gene[] {
    return Array.from(this.genes.values());
  }
  
  mutate(): DNA {
    const newDNA = new DNA();
    
    this.genes.forEach((gene, name) => {
      const shouldMutate = Math.random() < gene.mutationRate;
      
      if (shouldMutate) {
        // Create a mutation by adjusting the value slightly
        const mutationAmount = (Math.random() * 2 - 1) * 0.1; // -10% to +10%
        const newValue = Math.max(0, Math.min(1, gene.value + mutationAmount));
        
        newDNA.addGene({
          name,
          value: newValue,
          mutationRate: gene.mutationRate
        });
      } else {
        // Copy the gene as is
        newDNA.addGene({...gene});
      }
    });
    
    return newDNA;
  }
  
  // For creating offspring DNA by combining two parent DNAs
  static combine(dna1: DNA, dna2: DNA): DNA {
    const combinedDNA = new DNA();
    
    // Get all unique gene names from both parents
    const allGeneNames = new Set([
      ...dna1.genes.keys(),
      ...dna2.genes.keys()
    ]);
    
    allGeneNames.forEach(name => {
      const gene1 = dna1.getGene(name);
      const gene2 = dna2.getGene(name);
      
      if (gene1 && gene2) {
        // If both parents have the gene, randomly select one or average them
        const inheritanceType = Math.random();
        
        if (inheritanceType < 0.4) {
          // 40% chance to inherit from first parent
          combinedDNA.addGene({...gene1});
        } else if (inheritanceType < 0.8) {
          // 40% chance to inherit from second parent
          combinedDNA.addGene({...gene2});
        } else {
          // 20% chance to blend the genes
          combinedDNA.addGene({
            name,
            value: (gene1.value + gene2.value) / 2,
            mutationRate: (gene1.mutationRate + gene2.mutationRate) / 2
          });
        }
      } else if (gene1) {
        // Only first parent has the gene
        combinedDNA.addGene({...gene1});
      } else if (gene2) {
        // Only second parent has the gene
        combinedDNA.addGene({...gene2});
      }
    });
    
    return combinedDNA;
  }

  // Standard gene definitions for animals
  static STANDARD_GENES: GeneDefinition[] = [
    {
      name: 'size',
      defaultValue: 0.5,
      defaultMutationRate: 0.05,
      description: 'Physical size of the animal',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'speed',
      defaultValue: 0.5,
      defaultMutationRate: 0.1,
      description: 'Movement speed and agility',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'metabolism',
      defaultValue: 0.5,
      defaultMutationRate: 0.05,
      description: 'Rate of energy consumption',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'vision',
      defaultValue: 0.5,
      defaultMutationRate: 0.08,
      description: 'Ability to detect food and threats at a distance',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'intelligence',
      defaultValue: 0.3,
      defaultMutationRate: 0.03,
      description: 'Problem-solving and decision-making ability',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'aggression',
      defaultValue: 0.3,
      defaultMutationRate: 0.1,
      description: 'Tendency to fight rather than flee',
      minValue: 0,
      maxValue: 1.0
    },
    {
      name: 'socialBehavior',
      defaultValue: 0.5,
      defaultMutationRate: 0.07,
      description: 'Tendency to group with others',
      minValue: 0,
      maxValue: 1.0
    },
    {
      name: 'furColor',
      defaultValue: 0.5,
      defaultMutationRate: 0.15,
      description: 'Color of fur/skin',
      minValue: 0,
      maxValue: 1.0
    },
    {
      name: 'reproductiveUrge',
      defaultValue: 0.5,
      defaultMutationRate: 0.1,
      description: 'Desire to reproduce when conditions are right',
      minValue: 0.1,
      maxValue: 1.0
    },
    {
      name: 'lifespan',
      defaultValue: 0.5,
      defaultMutationRate: 0.05,
      description: 'Natural maximum age',
      minValue: 0.2,
      maxValue: 1.0
    },
    {
      name: 'maturityAge',
      defaultValue: 0.5,
      defaultMutationRate: 0.05,
      description: 'Age at which the animal reaches maturity',
      minValue: 0.2,
      maxValue: 0.8
    },
    {
      name: 'friendship',
      defaultValue: 0.5,
      defaultMutationRate: 0.1,
      description: 'Tendency to be friendly rather than aggressive',
      minValue: 0,
      maxValue: 1.0
    }
  ];

  // Add a static method to create a DNA with standard genes
  static createStandard(customValues?: Record<string, number>): DNA {
    const dna = new DNA();
    
    DNA.STANDARD_GENES.forEach(geneDef => {
      const value = customValues && customValues[geneDef.name] !== undefined 
        ? customValues[geneDef.name] 
        : geneDef.defaultValue;
      
      dna.addGene({
        name: geneDef.name,
        value: value,
        mutationRate: geneDef.defaultMutationRate
      });
    });
    
    return dna;
  }

  // Add a method to get a gene's description
  getGeneDescription(name: string): string | undefined {
    const geneDef = DNA.STANDARD_GENES.find(g => g.name === name);
    return geneDef?.description;
  }
} 