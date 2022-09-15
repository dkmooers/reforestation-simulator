import type { TreeSpecies } from "src/types"

export const treeSpecies: TreeSpecies[] = [
  {
    id: 'oak',
    color: '#ff0000',
    growthRate: 0.7,
    maxRadius: 40,
    shadeTolerance: 0.45,
    lifespan: 200,
    // isCoppiceable: false,
  },
  {
    id: 'maple',
    color: '#663399',
    growthRate: 0.9,
    maxRadius: 30,
    shadeTolerance: 0.45,
    lifespan: 400,
    // isCoppiceable: true,
  },
  {
    id: 'hickory',
    color: '#008080',
    growthRate: 0.8,
    maxRadius: 30,
    shadeTolerance: 0.5,
    lifespan: 500,
    // isCoppiceable: true,
  },
  {
    id: 'hazel',
    color: '#2196f3',
    growthRate: 0.7,
    maxRadius: 5,
    shadeTolerance: 0.55,
    foodProductivity: 1,
    lifespan: 80,
  },
  // {
  //   id: 'birch',
  //   color: '#666666',
  //   growthRate: 1.2,
  //   maxRadius: 30,
  //   shadeTolerance: 0.5,
  //   lifespan: 80,
  // },
  {
    id: 'ash',
    color: '#ffff00', // yellow
    growthRate: 0.85,
    maxRadius: 15,
    shadeTolerance: 0.5,
    lifespan: 150,
  },
  {
    id: 'linden',
    color: '#008000',
    growthRate: 0.7,
    maxRadius: 25,
    shadeTolerance: 0.5,
    lifespan: 150,
  },
  {
    id: 'beech',
    color: '#ffa500', // orange
    growthRate: 0.7,
    maxRadius: 20,
    shadeTolerance: 0.5,
    lifespan: 300,
  },
  {
    id: 'apple',
    color: '#f349a8', // fuchsia
    growthRate: 0.5,
    foodProductivity: 1,
    maxRadius: 25,
    shadeTolerance: 0.5,
    lifespan: 300,
  },
]