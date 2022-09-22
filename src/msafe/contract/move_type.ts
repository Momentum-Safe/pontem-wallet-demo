
export type vector<T> = T[]

export type Element<K, V> = {
    key: K,
    value: V
}
export type SimpleMap<V> = {
    data: vector<Element<string, V>>
}
