export type TreeSpecies = {
  id: string
  color: string
  growthRate: number
  maxRadius: number
  shadeTolerance: number // 0 to 1
  lifespan: number
}

export const treeSpecies: TreeSpecies[] = [
  {
    id: 'oak',
    color: 'red',
    growthRate: 1,
    maxRadius: 100,
    shadeTolerance: 0.4,
    lifespan: 200,
  },
  {
    id: 'maple',
    color: 'rebeccapurple',
    growthRate: 1.0,
    maxRadius: 80,
    shadeTolerance: 0.45,
    lifespan: 400,
  },
  {
    id: 'linden',
    color: 'green',
    growthRate: 0.6,
    maxRadius: 80,
    shadeTolerance: 0.5,
    lifespan: 150,
  },
  {
    id: 'hickory',
    color: 'teal',
    growthRate: 0.8,
    maxRadius: 60,
    shadeTolerance: 0.5,
    lifespan: 500,
  },
  {
    id: 'hazel',
    color: 'blue',
    growthRate: 0.8,
    maxRadius: 15,
    shadeTolerance: 0.65,
    lifespan: 80,
  }
]