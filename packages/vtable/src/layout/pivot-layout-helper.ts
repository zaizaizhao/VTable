import { isValid } from '@visactor/vutils';
import { NumberMap } from '../tools/NumberMap';
import { IndicatorDimensionKeyPlaceholder } from '../tools/global';
import type { Either } from '../tools/helper';
import type {
  CellInfo,
  ColumnIconOption,
  FieldData,
  HeaderData,
  ICustomRender,
  IDimension,
  IIndicator,
  IRowDimension,
  LayoutObjectId
} from '../ts-types';
import { HierarchyState } from '../ts-types';
import type { PivotHeaderLayoutMap } from './pivot-header-layout';
import type { ILinkDimension } from '../ts-types/pivot-table/dimension/link-dimension';
import type { IImageDimension } from '../ts-types/pivot-table/dimension/image-dimension';
// import { sharedVar } from './pivot-header-layout';

interface IPivotLayoutBaseHeadNode {
  id: number;
  // dimensionKey: string;
  // // title: string;
  // indicatorKey?: string;
  value: string;
  children: IPivotLayoutHeadNode[] | undefined;
  level: number;
  /** 节点跨占层数 如汇总节点跨几层维度 */
  levelSpan: number;
  startIndex: number;
  size: number; //对应到colSpan或者rowSpan
  // parsing?:  'img' | 'link' | 'video' | 'templateLink';
  startInTotal: number;
  // headerStyle:HeaderStyleOption| null;
  customRender?: ICustomRender;

  hierarchyState: HierarchyState;
  headerIcon?: (string | ColumnIconOption)[] | ((args: CellInfo) => (string | ColumnIconOption)[]);
}

interface IPivotLayoutDimensionHeadNode extends IPivotLayoutBaseHeadNode {
  dimensionKey: string;
}
interface IPivotLayoutIndicatorHeadNode extends IPivotLayoutBaseHeadNode {
  indicatorKey: string;
}
export type IPivotLayoutHeadNode = Either<IPivotLayoutDimensionHeadNode, IPivotLayoutIndicatorHeadNode>;
export class DimensionTree {
  sharedVar: { seqId: number };
  // 每一个值对应的序号 结果缓存
  // cache: {
  //   [propName: string]: any;
  // };
  //树形展示 会将非叶子节点单独展示一行 所以size会增加非叶子节点的个数
  sizeIncludeParent = false;
  rowExpandLevel: number;
  hierarchyType: 'grid' | 'tree';
  tree: IPivotLayoutHeadNode = {
    id: 0,
    dimensionKey: '',
    // title: '',
    value: '',
    children: [],
    level: -1,
    levelSpan: 1,
    startIndex: 0,
    size: 0,
    startInTotal: 0,
    hierarchyState: undefined
  };

  totalLevel = 0;

  // blockLevel: number = 0;

  // blockStartIndexMap: Map<number, boolean> = new Map();
  // blockEndIndexMap: Map<number, boolean> = new Map();
  dimensionKeys: NumberMap<string> = new NumberMap<string>();
  // dimensions: IDimension[] | undefined;//目前用不到这个
  constructor(
    tree: IPivotLayoutHeadNode[],
    sharedVar: { seqId: number },
    hierarchyType: 'grid' | 'tree' = 'grid',
    rowExpandLevel: number = undefined
  ) {
    this.sizeIncludeParent = rowExpandLevel !== null && rowExpandLevel !== undefined;
    this.rowExpandLevel = rowExpandLevel;
    this.hierarchyType = hierarchyType;
    this.sharedVar = sharedVar;
    this.reset(tree);
  }

  reset(tree: IPivotLayoutHeadNode[], updateTreeNode = false) {
    // 清空缓存的计算
    // this.cache = {};
    // this.dimensions = dimensions;
    this.dimensionKeys = new NumberMap<string>();
    this.tree.children = tree as IPivotLayoutHeadNode[];
    // const re = { totalLevel: 0 };
    // if (updateTreeNode) this.updateTreeNode(this.tree, 0, re, this.tree);
    // else
    this.setTreeNode(this.tree, 0, this.tree);
    this.totalLevel = this.dimensionKeys.count();
  }
  setTreeNode(node: IPivotLayoutHeadNode, startIndex: number, parent: IPivotLayoutHeadNode): number {
    node.startIndex = startIndex;
    node.startInTotal = (parent.startInTotal ?? 0) + node.startIndex;
    // if (node.dimensionKey) {
    //   !this.dimensionKeys.contain(node.dimensionKey) &&
    //     this.dimensionKeys.put(node.level, node.dimensionKey);
    //   if (!node.id) node.id = ++seqId;
    // }
    if (node.dimensionKey ?? node.indicatorKey) {
      !this.dimensionKeys.contain(node.indicatorKey ? IndicatorDimensionKeyPlaceholder : node.dimensionKey) &&
        this.dimensionKeys.put(node.level, node.indicatorKey ? IndicatorDimensionKeyPlaceholder : node.dimensionKey);
      if (!node.id) {
        node.id = ++this.sharedVar.seqId;
      }
    }
    let size = node.dimensionKey ? (this.sizeIncludeParent ? 1 : 0) : 0;
    //平铺展示 分析所有层级
    if (this.hierarchyType === 'grid') {
      if (node.children?.length >= 1) {
        node.children.forEach(n => {
          n.level = (node.level ?? 0) + 1;
          size += this.setTreeNode(n, size, node);
        });
      } else {
        size = 1;
        // re.totalLevel = Math.max(re.totalLevel, (node.level ?? -1) + 1);
      }
    } else if (node.hierarchyState === HierarchyState.expand && node.children?.length >= 1) {
      //树形展示 有子节点 且下一层需要展开
      node.children.forEach(n => {
        n.level = (node.level ?? 0) + 1;
        size += this.setTreeNode(n, size, node);
      });
    } else if (node.hierarchyState === HierarchyState.collapse && node.children?.length >= 1) {
      //树形展示 有子节点 且下一层不需要展开
      node.children.forEach(n => {
        n.level = (node.level ?? 0) + 1;
        this.setTreeNode(n, size, node);
      });
    } else if (!node.hierarchyState && node.level + 1 < this.rowExpandLevel && node.children?.length >= 1) {
      //树形展示 有子节点 且下一层需要展开
      node.hierarchyState = HierarchyState.expand;
      node.children.forEach(n => {
        n.level = (node.level ?? 0) + 1;
        size += this.setTreeNode(n, size, node);
      });
    } else if (node.children?.length >= 1) {
      //树形展示 有子节点 且下一层不需要展开
      node.hierarchyState = HierarchyState.collapse;
      node.children.forEach(n => {
        n.level = (node.level ?? 0) + 1;
        this.setTreeNode(n, size, node);
      });
    } else {
      //树形展示 无children子节点。但不能确定是最后一层的叶子节点 totalLevel还不能确定是计算完整棵树的整体深度
      node.hierarchyState = HierarchyState.none;
      size = 1;
      // re.totalLevel = Math.max(re.totalLevel, (node.level ?? -1) + 1);
    }

    node.size = size;
    // startInTotal = parent.startIndex + prevStartIndex
    return size;
  }
  getTreePath(index: number, maxDeep = 30): Array<IPivotLayoutHeadNode> {
    const path: any[] = [];
    this.searchPath(index, this.tree, path, maxDeep);
    path.shift();
    return path;
  }

  getTreePathByCellIds(ids: LayoutObjectId[]): Array<IPivotLayoutHeadNode> {
    const path: any[] = [];
    let nodes = this.tree.children;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const pathNode = this.findNodeById(nodes, id);
      if (pathNode) {
        path.push(pathNode);
        nodes = pathNode.children;
      } else {
        break;
      }
    }
    // path.shift();
    return path;
  }
  findNodeById(nodes: IPivotLayoutHeadNode[], id: LayoutObjectId) {
    return nodes.find(node => {
      return node.id === id;
    });
  }
  searchPath(index: number, node: IPivotLayoutHeadNode, path: Array<IPivotLayoutHeadNode>, maxDeep: number) {
    if (!node) {
      return false;
    }
    if (index < node.startIndex || index >= node.startIndex + node.size) {
      return false;
    }
    path.push(node);
    if (!node.children || node.children.length === 0) {
      return true;
    }
    if (node.level >= maxDeep) {
      return true;
    }
    // 这里按照 数据填充时，序号时同级序号 还是全局序号
    const cIndex = index - node.startIndex;
    node.children.some(n => this.searchPath(cIndex, n, path, maxDeep));
    return true;
  }
  /**
   * 将该树中 层级为level 的sourceIndex处的节点移动到targetIndex位置
   * @param level
   * @param sourceIndex
   * @param targetIndex
   */
  movePosition(level: number, sourceIndex: number, targetIndex: number) {
    // let sourceNode: IPivotLayoutHeadNode;
    let parNode: IPivotLayoutHeadNode;
    let sourceSubIndex: number;
    let targetSubIndex: number;
    /**
     * 对parNode的子节点第subIndex处的node节点 进行判断是否为sourceIndex或者targetIndex
     * 如果是 则记录下subIndex 以对parNode中个节点位置进行移位
     * @param node
     * @param subIndex
     * @returns
     */
    const findTargetNode = (node: IPivotLayoutHeadNode, subIndex: number) => {
      if (sourceSubIndex !== undefined && targetSubIndex !== undefined) {
        return;
      }
      if (node.level === level) {
        if (node.startInTotal === sourceIndex) {
          // sourceNode = node;
          sourceSubIndex = subIndex;
        }
        // if (node.startInTotal === targetIndex) targetSubIndex = subIndex;
        // 判断targetIndex是否在node的范围内 将当前node的subIndex记为targetSubIndex
        if (node.startInTotal <= targetIndex && targetIndex <= node.startInTotal + node.size - 1) {
          targetSubIndex = subIndex;
        }
      }

      if (node.children && node.level < level) {
        parNode = node;
        for (let i = 0; i < node.children.length; i++) {
          if (
            (sourceIndex >= node.children[i].startInTotal &&
              sourceIndex <= node.children[i].startInTotal + node.children[i].size) ||
            (targetIndex >= node.children[i].startInTotal &&
              targetIndex <= node.children[i].startInTotal + node.children[i].size)
          ) {
            findTargetNode(node.children[i], i);
          }
        }
      }
    };
    findTargetNode(this.tree, 0);

    //对parNode子节点位置进行移位【根据sourceSubIndex和targetSubIndex】
    const sourceColumns = parNode.children.splice(sourceSubIndex, 1);
    sourceColumns.unshift(targetSubIndex as any, 0 as any);
    Array.prototype.splice.apply(parNode.children, sourceColumns);
  }
}

//#region 为方法getLayoutRowTree提供的类型和工具方法
export type LayouTreeNode = {
  dimensionKey?: string;
  indicatorKey?: string;
  value: string;
  hierarchyState: HierarchyState;
  children?: LayouTreeNode[];
};

export function generateLayoutTree(tree: LayouTreeNode[], children: IPivotLayoutHeadNode[]) {
  children?.forEach((node: IPivotLayoutHeadNode) => {
    const diemnsonNode: {
      dimensionKey?: string;
      indicatorKey?: string;
      value: string;
      hierarchyState: HierarchyState;
      children: any;
    } = {
      dimensionKey: node.dimensionKey,
      indicatorKey: node.indicatorKey,
      value: node.value,
      hierarchyState: node.hierarchyState,
      children: undefined
    };
    tree.push(diemnsonNode);
    if (node.children) {
      diemnsonNode.children = [];
      generateLayoutTree(diemnsonNode.children, node.children);
    }
  });
}
//#endregion

//#region   为方法getLayoutRowTreeCount提的工具方法
export function countLayoutTree(children: { children?: any }[], countParentNode: boolean) {
  let count = 0;
  children?.forEach((node: IPivotLayoutHeadNode) => {
    if (countParentNode) {
      count++;
    } else {
      if (!node.children || node.children.length === 0) {
        count++;
      }
    }
    if (node.children) {
      count += countLayoutTree(node.children, countParentNode);
    }
  });
  return count;
}
//#endregion

export function dealHeader(
  hd: IPivotLayoutHeadNode,
  _headerCellIds: number[][],
  results: HeaderData[],
  roots: number[],
  row: number,
  layoutMap: PivotHeaderLayoutMap
) {
  // const col = this._columns.length;
  const id = hd.id;
  const dimensionInfo: IDimension =
    (layoutMap.rowsDefine?.find(dimension =>
      typeof dimension === 'string' ? false : dimension.dimensionKey === hd.dimensionKey
    ) as IDimension) ??
    (layoutMap.columnsDefine?.find(dimension =>
      typeof dimension === 'string' ? false : dimension.dimensionKey === hd.dimensionKey
    ) as IDimension);
  const indicatorInfo = layoutMap.indicatorsDefine?.find(indicator => {
    if (typeof indicator === 'string') {
      return false;
    }
    if (hd.indicatorKey) {
      return indicator.indicatorKey === hd.indicatorKey;
    }
    return indicator.title === hd.value;
  }) as IIndicator;
  const cell: HeaderData = {
    id,
    title: hd.value ?? indicatorInfo?.title,
    field: hd.dimensionKey,
    style:
      typeof (indicatorInfo ?? dimensionInfo)?.headerStyle === 'function'
        ? (indicatorInfo ?? dimensionInfo)?.headerStyle
        : Object.assign({}, (indicatorInfo ?? dimensionInfo)?.headerStyle),
    headerType: indicatorInfo?.headerType ?? dimensionInfo?.headerType ?? 'text',
    headerIcon: indicatorInfo?.headerIcon ?? dimensionInfo?.headerIcon,
    // define: <any>hd,
    define: Object.assign({}, <any>hd, indicatorInfo ?? dimensionInfo),
    fieldFormat: indicatorInfo?.headerFormat ?? dimensionInfo?.headerFormat,
    // iconPositionList:[]
    dropDownMenu: indicatorInfo?.dropDownMenu ?? dimensionInfo?.dropDownMenu,
    pivotInfo: {
      value: hd.value,
      dimensionKey: hd.dimensionKey,
      isPivotCorner: false
      // customInfo: dimensionInfo?.customInfo
    },
    width: (dimensionInfo as IRowDimension)?.width,
    minWidth: (dimensionInfo as IRowDimension)?.minWidth,
    maxWidth: (dimensionInfo as IRowDimension)?.maxWidth,
    showSort: indicatorInfo?.showSort ?? dimensionInfo?.showSort,
    description: dimensionInfo?.description
  };

  if (indicatorInfo) {
    //收集indicatorDimensionKey  提到了构造函数中
    // this.indicatorDimensionKey = dimensionInfo.dimensionKey;
    if (indicatorInfo.customRender) {
      hd.customRender = indicatorInfo.customRender;
    }
    if (!isValid(layoutMap._indicators?.find(indicator => indicator.indicatorKey === indicatorInfo.indicatorKey))) {
      layoutMap._indicators?.push({
        id: ++layoutMap.sharedVar.seqId,
        indicatorKey: indicatorInfo.indicatorKey,
        field: indicatorInfo.indicatorKey,
        fieldFormat: indicatorInfo?.format,
        cellType: indicatorInfo?.cellType ?? (indicatorInfo as any)?.columnType ?? 'text',
        chartModule: 'chartModule' in indicatorInfo ? indicatorInfo.chartModule : null,
        chartSpec: 'chartSpec' in indicatorInfo ? indicatorInfo.chartSpec : null,
        sparklineSpec: 'sparklineSpec' in indicatorInfo ? indicatorInfo.sparklineSpec : null,
        style: indicatorInfo?.style,
        icon: indicatorInfo?.icon,
        define: Object.assign({}, <any>hd, indicatorInfo, {
          dragHeader: dimensionInfo?.dragHeader
        }),
        width: indicatorInfo?.width,
        minWidth: indicatorInfo?.minWidth,
        maxWidth: indicatorInfo?.maxWidth,
        disableColumnResize: indicatorInfo?.disableColumnResize
      });
    }
  } else if (hd.indicatorKey) {
    //兼容当某个指标没有设置在dimension.indicators中
    if (!isValid(layoutMap._indicators?.find(indicator => indicator.indicatorKey === hd.indicatorKey))) {
      layoutMap._indicators?.push({
        id: ++layoutMap.sharedVar.seqId,
        indicatorKey: hd.indicatorKey,
        field: hd.indicatorKey,
        cellType: 'text',
        define: Object.assign({}, <any>hd)
      });
    }
  }
  // if (dimensionInfo.indicators) {
  //   layoutMap.hideIndicatorName = dimensionInfo.hideIndicatorName ?? false;
  //   layoutMap.indicatorsAsCol = dimensionInfo.indicatorsAsCol ?? true;
  // }
  results[id] = cell;
  layoutMap._headerObjects[id] = cell;
  _headerCellIds[row][layoutMap.colIndex] = id;
  for (let r = row - 1; r >= 0; r--) {
    _headerCellIds[r][layoutMap.colIndex] = roots[r];
  }

  // 处理汇总小计跨维度层级的情况
  if ((hd as any).levelSpan > 1) {
    for (let i = 1; i < (hd as any).levelSpan; i++) {
      if (!_headerCellIds[row + i]) {
        _headerCellIds[row + i] = [];
      }
      _headerCellIds[row + i][layoutMap.colIndex] = id;
    }
  }

  if ((hd as IPivotLayoutHeadNode).children?.length >= 1) {
    layoutMap
      ._addHeaders(_headerCellIds, row + ((hd as any).levelSpan ?? 1), (hd as IPivotLayoutHeadNode).children ?? [], [
        ...roots,
        ...Array((hd as any).levelSpan ?? 1).fill(id)
      ])
      .forEach(c => results.push(c));
  } else {
    // columns.push([""])//代码一个路径
    for (let r = row + 1; r < _headerCellIds.length; r++) {
      _headerCellIds[r][layoutMap.colIndex] = id;

      // if ((hd as any).levelSpan > 1) {
      //   for (let i = 1; i < (hd as any).levelSpan; i++) {
      //     _headerCellIds[r + i][layoutMap.colIndex] = id;
      //   }
      // }
    }
    layoutMap.colIndex++;
  }
}

export function dealHeaderForTreeMode(
  hd: IPivotLayoutHeadNode,
  _headerCellIds: number[][],
  results: HeaderData[],
  roots: number[],
  row: number,
  totalLevel: number,
  show: boolean,
  dimensions: (IDimension | string)[],
  layoutMap: PivotHeaderLayoutMap
) {
  const id = hd.id;
  // const dimensionInfo: IDimension =
  //   (this.rowsDefine?.find(dimension =>
  //     typeof dimension === 'string' ? false : dimension.dimensionKey === hd.dimensionKey
  //   ) as IDimension) ??
  //   (this.columnsDefine?.find(dimension =>
  //     typeof dimension === 'string' ? false : dimension.dimensionKey === hd.dimensionKey
  //   ) as IDimension);
  const dimensionInfo: IDimension = dimensions.find(dimension =>
    typeof dimension === 'string' ? false : dimension.dimensionKey === hd.dimensionKey
  ) as IDimension;

  const cell: HeaderData = {
    id,
    title: hd.value,
    field: hd.dimensionKey as FieldData,
    //如果不是整棵树的叶子节点，都靠左显示
    style:
      hd.level + 1 === totalLevel || typeof dimensionInfo?.headerStyle === 'function'
        ? dimensionInfo?.headerStyle
        : Object.assign({}, dimensionInfo?.headerStyle, { textAlign: 'left' }),
    headerType: dimensionInfo?.headerType ?? 'text',
    headerIcon: dimensionInfo?.headerIcon,
    define: Object.assign(<any>hd, {
      linkJump: (dimensionInfo as ILinkDimension)?.linkJump,
      linkDetect: (dimensionInfo as ILinkDimension)?.linkDetect,
      templateLink: (dimensionInfo as ILinkDimension)?.templateLink,

      // image相关 to be fixed
      keepAspectRatio: (dimensionInfo as IImageDimension)?.keepAspectRatio ?? false,
      imageAutoSizing: (dimensionInfo as IImageDimension)?.imageAutoSizing,

      headerCustomRender: dimensionInfo?.headerCustomRender,
      headerCustomLayout: dimensionInfo?.headerCustomLayout,
      dragHeader: dimensionInfo?.dragHeader,
      disableHeaderHover: !!dimensionInfo?.disableHeaderHover,
      disableHeaderSelect: !!dimensionInfo?.disableHeaderSelect
    }), //这里不能新建对象，要用hd保持引用关系
    fieldFormat: dimensionInfo?.headerFormat,
    // iconPositionList:[]
    dropDownMenu: dimensionInfo?.dropDownMenu,
    pivotInfo: {
      value: hd.value,
      dimensionKey: hd.dimensionKey as string,
      isPivotCorner: false
      // customInfo: dimensionInfo?.customInfo
    },
    hierarchyLevel: hd.level,
    dimensionTotalLevel: totalLevel,
    hierarchyState: hd.level + 1 === totalLevel ? undefined : hd.hierarchyState,
    width: (dimensionInfo as IRowDimension)?.width,
    minWidth: (dimensionInfo as IRowDimension)?.minWidth,
    maxWidth: (dimensionInfo as IRowDimension)?.maxWidth,
    parentCellId: roots[roots.length - 1]
  };

  results[id] = cell;
  // this._cellIdDiemnsionMap.set(id, {
  //   dimensionKey: hd.dimensionKey,
  //   value: hd.value
  // });
  layoutMap._headerObjects[id] = cell;
  _headerCellIds[row][layoutMap.colIndex] = id;
  for (let r = row - 1; r >= 0; r--) {
    _headerCellIds[r][layoutMap.colIndex] = roots[r];
  }
  if (hd.hierarchyState === HierarchyState.expand && (hd as IPivotLayoutHeadNode).children?.length >= 1) {
    //row传值 colIndex++和_addHeaders有区别
    show && layoutMap.colIndex++;
    layoutMap
      ._addHeadersForTreeMode(
        _headerCellIds,
        row,
        (hd as IPivotLayoutHeadNode).children ?? [],
        [...roots, id],
        totalLevel,
        show && hd.hierarchyState === HierarchyState.expand, //当前节点show 且当前节点状态为展开 则传给子节点为show：true
        dimensions
      )
      .forEach(c => results.push(c));
  } else {
    // columns.push([""])//代码一个路径
    show && layoutMap.colIndex++;
    for (let r = row + 1; r < _headerCellIds.length; r++) {
      _headerCellIds[r][layoutMap.colIndex] = id;
    }
  }
}
