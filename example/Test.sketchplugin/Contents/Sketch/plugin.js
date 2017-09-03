// Renames `Rectangle` to `Circle` in all layers
function renameAllRectangles (context) {  
  context.document.pages()[0].layers().forEach(layer => {
    const newName = String(layer.name()).replace('Rectangle', 'Cicle');
    layer.name = newName;
  });
}

// Removes selected layers
function removeSelected (context) {
  const selected = context.selection;
  if (!selected.length) {
    log('Nothing selected');
    return;
  }
  selected.forEach(layer => layer.removeFromParent());
}