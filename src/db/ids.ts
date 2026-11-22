/**
 * Ids for new products and photos. Auto-increment ids would collide between
 * synced devices (both would create #21), so new items get a time-based id
 * with a random tail. Safe integer, keeps `p<id>` keys working.
 */
export function newId(): number {
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}
