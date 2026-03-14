import React, { useState } from 'react';

function ShoppingList({ shoppingList, setShoppingList }) {
  const [checked, setChecked] = useState({});
  const [newItem, setNewItem] = useState('');
  const [addingTo, setAddingTo] = useState(null);

  const toggleCheck = (sectionIndex, itemIndex) => {
    const key = sectionIndex + '-' + itemIndex;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addItem = (sectionIndex) => {
    if (!newItem.trim()) return;
    const updated = shoppingList.map((section, i) => {
      if (i !== sectionIndex) return section;
      return {
        ...section,
        items: [...section.items, { item: newItem.trim(), amount: '', meal: 'added by you' }]
      };
    });
    setShoppingList(updated);
    setNewItem('');
    setAddingTo(null);
  };

  const shareList = () => {
    const text = shoppingList.map(section =>
      section.name.toUpperCase() + '\n' +
      section.items.map(i => '- ' + i.item + (i.amount ? ' (' + i.amount + ')' : '')).join('\n')
    ).join('\n\n');
    if (navigator.share) {
      navigator.share({ title: 'Tablemates Shopping List', text: text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Shopping list copied to clipboard!');
    }
  };

  if (!shoppingList || shoppingList.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🛒</div>
        <div className="empty-title">no shopping list yet</div>
        <div className="empty-sub">go to "this week", plan your meals, then generate a shopping list</div>
      </div>
    );
  }

  const totalItems = shoppingList.reduce((acc, s) => acc + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div className="shop-top">
        <div className="shop-progress">
          <div className="shop-progress-text">{checkedCount} of {totalItems} items</div>
          <div className="shop-progress-bar">
            <div className="shop-progress-fill" style={{ width: totalItems > 0 ? (checkedCount / totalItems * 100) + '%' : '0%' }}></div>
          </div>
        </div>
        <button className="share-btn" onClick={shareList}>share</button>
      </div>

      {shoppingList.map((section, si) => (
        <div key={si} className="shop-section">
          <div className="shop-section-label">{section.name}</div>

          {section.items.map((item, ii) => {
            const key = si + '-' + ii;
            const done = checked[key];
            return (
              <div key={ii} className="shop-item" onClick={() => toggleCheck(si, ii)}>
                <div className={'shop-checkbox' + (done ? ' checked' : '')}>
                  {done && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <div className={'shop-item-name' + (done ? ' shop-item-done' : '')}>{item.item}</div>
                {item.amount ? <div className="shop-item-amount">{item.amount}</div> : null}
            
              </div>
            );
          })}

          {addingTo === si ? (
            <div className="input-row" style={{ marginTop: '8px' }}>
              <input
                className="text-input small"
                placeholder="Add an item..."
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem(si)}
                autoFocus
              />
              <button className="add-tag-btn" onClick={() => addItem(si)}>+</button>
            </div>
          ) : (
            <button className="add-event-btn" style={{ marginTop: '8px' }} onClick={() => setAddingTo(si)}>
              + add item
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default ShoppingList;