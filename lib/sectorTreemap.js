// Balanced area-preserving treemap: each rectangle represents its record count.
export function sectorTreemap(groups, width = 1000, height = 420) {
  const values = groups.filter(g => Number.isFinite(g.count) && g.count > 0).sort((a,b) => b.count-a.count || a.name.localeCompare(b.name));
  function split(items, x, y, w, h) {
    if (!items.length) return [];
    if (items.length === 1) return [{...items[0], x, y, width:w, height:h}];
    const sum = items.reduce((n,item)=>n+item.count,0);
    let index=1, first=items[0].count;
    while(index < items.length-1 && Math.abs(first+items[index].count-sum/2)<Math.abs(first-sum/2))first+=items[index++].count;
    const ratio=first/sum;
    return w>=h ? [...split(items.slice(0,index),x,y,w*ratio,h),...split(items.slice(index),x+w*ratio,y,w*(1-ratio),h)] : [...split(items.slice(0,index),x,y,w,h*ratio),...split(items.slice(index),x,y+h*ratio,w,h*(1-ratio))];
  }
  return split(values,0,0,width,height);
}
