import type { TreeSpecies } from "src/types";

export const treeSpecies: TreeSpecies[] = [
  {
    id: 'oak',
    color: '#ff0000',
    growthRate: 1,
    maxRadius: 100,
    shadeTolerance: 0.4,
    lifespan: 200,
  },
  {
    id: 'maple',
    color: '#663399',
    growthRate: 1.0,
    maxRadius: 80,
    shadeTolerance: 0.45,
    lifespan: 400,
  },
  {
    id: 'linden',
    color: '#008000',
    growthRate: 0.6,
    maxRadius: 80,
    shadeTolerance: 0.5,
    lifespan: 150,
  },
  {
    id: 'hickory',
    color: '#008080',
    growthRate: 0.8,
    maxRadius: 60,
    shadeTolerance: 0.5,
    lifespan: 500,
  },
  {
    id: 'hazel',
    color: '#2196f3',
    growthRate: 0.8,
    maxRadius: 15,
    shadeTolerance: 0.55,
    lifespan: 80,
  }
]