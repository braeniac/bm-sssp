
export type Node = number; 

export type Edge = {
    u : Node,
    v : Node,
    w : number
}

export type GraphInput = {
    n : number, 
    edges : Edge[],
    directed ?: boolean
} |
{
    n : number,
    adj: Array<Array<{ v : Node ; w : number }>>,
    directed ?: boolean
}

export type GSRGraph = {
    n : number, 
    m: number,
    directed : boolean,
    rowPtr: Int32Array,
    cols: Int32Array,
    weights: Float64Array
}

export type SSSPOptions = {
    source : Node,
    returnPredecessors ?: boolean,
    kSteps ?: number,
    pivotFactor ?: number
}

export type SSSPResult = {
  dist: Float64Array 
  pred?: Int32Array, 
  hops?: Int32Array
};


