import type { Group } from '../../graphic/group';
import { computeColsWidth } from '../../layout/compute-col-width';
import { computeRowsHeight } from '../../layout/compute-row-height';
import { createColGroup } from '../column';
import type { SceneProxy } from './proxy';

export async function createGroupForFirstScreen(
  cornerHeaderGroup: Group,
  colHeaderGroup: Group,
  rowHeaderGroup: Group,
  rightFrozenGroup: Group,
  bottomFrozenGroup: Group,
  bodyGroup: Group,
  xOrigin: number,
  yOrigin: number,
  proxy: SceneProxy
) {
  const { table } = proxy;
  const { leftBottomCornerGroup, rightTopCornerGroup, rightBottomCornerGroup } = table.scenegraph;

  // compute parameters
  proxy.setParamsForRow();
  proxy.setParamsForColumn();

  // compute colums width in first screen
  computeColsWidth(table, 0, Math.min(proxy.firstScreenColLimit, table.colCount - 1));

  // compute rows height in first screen
  computeRowsHeight(table, 0, Math.min(proxy.firstScreenRowLimit, table.rowCount - 1));

  if (table.rightFrozenColCount > 0 && table.colCount - 1 > proxy.firstScreenColLimit) {
    // compute right frozen row height
    computeColsWidth(table, table.colCount - 1 - table.rightFrozenColCount + 1, table.colCount - 1);
  }
  if (table.bottomFrozenRowCount > 0 && table.rowCount - 1 > proxy.firstScreenRowLimit) {
    // compute bottom frozen row height
    computeColsWidth(table, table.rowCount - 1 - table.bottomFrozenRowCount + 1, table.rowCount - 1);
  }

  // update colHeaderGroup rowHeaderGroup bodyGroup position
  table.scenegraph.colHeaderGroup.setAttribute('x', table.getFrozenColsWidth());
  table.scenegraph.rowHeaderGroup.setAttribute('y', table.getFrozenRowsHeight());
  table.scenegraph.bottomFrozenGroup.setAttribute('x', table.getFrozenColsWidth());
  table.scenegraph.rightFrozenGroup.setAttribute('y', table.getFrozenRowsHeight());
  table.scenegraph.bodyGroup.setAttributes({
    x: table.getFrozenColsWidth(),
    y: table.getFrozenRowsHeight()
  });

  // create cornerHeaderGroup
  createColGroup(
    cornerHeaderGroup,
    xOrigin,
    yOrigin,
    0, // colStart
    table.frozenColCount - 1, // colEnd
    0, // rowStart
    table.columnHeaderLevelCount - 1, // rowEnd
    table.isListTable() ? 'columnHeader' : 'cornerHeader', // CellType
    table
  );

  // create colHeaderGroup
  createColGroup(
    colHeaderGroup,
    xOrigin,
    yOrigin,
    table.frozenColCount, // colStart
    Math.min(proxy.firstScreenColLimit, table.colCount - 1 - table.rightFrozenColCount), // colEnd
    0, // rowStart
    table.columnHeaderLevelCount - 1, // rowEnd
    'columnHeader', // isHeader
    table
  );

  // create rowHeaderGroup
  createColGroup(
    rowHeaderGroup,
    xOrigin,
    yOrigin,
    0, // colStart
    table.frozenColCount - 1, // colEnd
    table.columnHeaderLevelCount, // rowStart
    Math.min(proxy.firstScreenRowLimit, table.rowCount - 1 - table.bottomFrozenRowCount), // rowEnd
    table.isListTable() && !table.internalProps.transpose ? 'body' : 'rowHeader', // isHeader
    table
  );

  if (table.bottomFrozenRowCount > 0) {
    if (!table.isPivotChart()) {
      // create left bottom frozen
      createColGroup(
        leftBottomCornerGroup,
        xOrigin,
        yOrigin,
        0, // colStart
        table.frozenColCount - 1, // colEnd
        table.rowCount - 1 - table.bottomFrozenRowCount + 1, // rowStart
        table.rowCount - 1, // rowEnd
        table.isListTable() ? 'body' : 'rowHeader', // isHeader
        table
      );
    }
    // create bottomFrozenGroup
    createColGroup(
      bottomFrozenGroup,
      xOrigin,
      yOrigin,
      table.frozenColCount, // colStart
      Math.min(proxy.firstScreenColLimit, table.colCount - 1 - table.rightFrozenColCount), // colEnd
      table.rowCount - 1 - table.bottomFrozenRowCount + 1, // rowStart
      table.rowCount - 1, // rowEnd
      table.isPivotChart() ? 'rowHeader' : 'body', // isHeader
      table
    );
  }

  if (table.rightFrozenColCount > 0) {
    if (!table.isPivotChart()) {
      // create right top frozen Group
      createColGroup(
        rightTopCornerGroup,
        xOrigin,
        yOrigin,
        table.colCount - 1 - table.rightFrozenColCount + 1, // colStart
        table.colCount - 1, // colEnd
        0, // rowStart
        table.columnHeaderLevelCount - 1, // rowEnd
        'columnHeader', // isHeader
        table
      );
    }
    // create rightFrozenGroup
    createColGroup(
      rightFrozenGroup,
      xOrigin,
      yOrigin,
      table.colCount - 1 - table.rightFrozenColCount + 1, // colStart
      table.colCount - 1, // colEnd
      table.columnHeaderLevelCount, // rowStart
      Math.min(proxy.firstScreenRowLimit, table.rowCount - 1 - table.bottomFrozenRowCount), // rowEnd
      table.isPivotChart() ? 'rowHeader' : 'body', // isHeader
      table
    );
  }

  if (table.bottomFrozenRowCount > 0 && table.rightFrozenColCount > 0 && !table.isPivotChart()) {
    // create right bottom frozen Group
    createColGroup(
      rightBottomCornerGroup,
      xOrigin,
      yOrigin,
      table.colCount - 1 - table.rightFrozenColCount + 1, // colStart
      table.colCount - 1, // colEnd
      table.rowCount - 1 - table.bottomFrozenRowCount + 1, // rowStart
      table.rowCount - 1, // rowEnd
      'body', // isHeader
      table
    );
  }

  // create bodyGroup
  createColGroup(
    bodyGroup,
    xOrigin,
    yOrigin,
    table.frozenColCount, // colStart
    Math.min(proxy.firstScreenColLimit, table.colCount - 1 - table.rightFrozenColCount), // colEnd
    table.columnHeaderLevelCount, // rowStart
    Math.min(proxy.firstScreenRowLimit, table.rowCount - 1 - table.bottomFrozenRowCount), // rowEnd
    'body', // isHeader
    table
  );

  // update progress information
  if (!bodyGroup.firstChild) {
    // 无数据
    proxy.currentRow = proxy.totalRow;
    proxy.rowEnd = proxy.currentRow;
    proxy.rowUpdatePos = proxy.rowEnd;
    proxy.referenceRow = proxy.rowStart + Math.floor((proxy.rowEnd - proxy.rowStart) / 2);

    proxy.currentCol = proxy.totalCol;
    proxy.colEnd = proxy.currentCol;
    proxy.colUpdatePos = proxy.colEnd;
    proxy.referenceCol = proxy.colStart + Math.floor((proxy.colEnd - proxy.colStart) / 2);
  } else {
    proxy.currentRow = (bodyGroup.firstChild as Group)?.rowNumber ?? proxy.totalRow;
    proxy.rowEnd = proxy.currentRow;
    proxy.rowUpdatePos = proxy.rowEnd;
    proxy.referenceRow = proxy.rowStart + Math.floor((proxy.rowEnd - proxy.rowStart) / 2);

    proxy.currentCol = (bodyGroup.lastChild as Group)?.col ?? proxy.totalCol;
    proxy.colEnd = proxy.currentCol;
    proxy.colUpdatePos = proxy.colEnd;
    proxy.referenceCol = proxy.colStart + Math.floor((proxy.colEnd - proxy.colStart) / 2);

    // 开始异步任务
    await proxy.progress();
  }
}
