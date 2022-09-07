
export type vector<T> = T[]

export type Element<K, V> = {
    key: K,
    value: V
}
export type SimpleMap<K, V> = {
    data: vector<Element<K, V>>
}
