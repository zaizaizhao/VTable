---
category: examples
group: event
title: onReady
cover: https://lf9-dp-fe-cms-tos.byteorg.com/obj/bit-cloud/VTable/preview/react-default-new.png
order: 1-1
link: '../guide/table_type/List_table/list_table_define_and_generate'
option: ListTable-columns-text#cellType
---

# onReady

The onReady callback is triggered after the table completes initialization or update. You can obtain the table instance and whether it is the first rendering.

## code demo
```javascript livedemo template=vtable-openinula
// import * as InulaVTable from '@visactor/openinula-vtable';

const option = {
  header: [
    {
      field: '0',
      caption: 'name',
    },
    {
      field: '1',
      caption: 'age',
    },
    {
      field: '2',
      caption: 'gender',
    },
    {
      field: '3',
      caption: 'hobby',
    },
  ],
  records: new Array(1000).fill(['John', 18, 'male', '🏀']),
};

const root = document.getElementById(CONTAINER_ID);
Inula.render(
  <InulaVTable.ListTable
    option={option}
    height={'500px'}
    onReady={(tableInstance, isFirst) => {
      console.log(tableInstance, isFirst)
    }}
  />,
  root
);

// release openinula instance, do not copy
window.customRelease = () => {
  Inula.unmountComponentAtNode(root);
};
```