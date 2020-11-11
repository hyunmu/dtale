import _ from "lodash";
import $ from "jquery";
import { logException } from "../fetcher";

export function convertCellIdxToCoords(cellIdx) {
  return _.map(_.split(cellIdx, "|"), v => parseInt(v));
}

export function buildRanges(cell1, cell2) {
  const [col1, row1] = convertCellIdxToCoords(cell1);
  const [col2, row2] = convertCellIdxToCoords(cell2);
  const colRange = [col1, col2];
  colRange.sort();
  const rowRange = [row1, row2];
  rowRange.sort();
  return { colRange, rowRange };
}

function baseIsInColRange(currCol, columnRange) {
  const finalRange = [columnRange.start, columnRange.end];
  finalRange.sort();
  return currCol >= finalRange[0] && currCol <= finalRange[1];
}

export function isInRange(currCol, currRow, rangeSelect, columnRange) {
  if (columnRange && columnRange.start && columnRange.end) {
    return baseIsInColRange(currCol, columnRange);
  }
  if (!rangeSelect || !rangeSelect.start || !rangeSelect.end) {
    return false;
  }
  const { colRange, rowRange } = buildRanges(rangeSelect.start, rangeSelect.end);
  const inCols = currCol >= colRange[0] && currCol <= colRange[1];
  const inRows = currRow >= rowRange[0] && currRow <= rowRange[1];
  return inCols && inRows;
}

export function isInColumnRange(currCol, columnRange) {
  if (!columnRange || !columnRange.start || !columnRange.end) {
    return false;
  }
  return baseIsInColRange(currCol, columnRange);
}

export function buildCopyText(data, columns, cell1, cell2) {
  const { colRange, rowRange } = buildRanges(cell1, cell2);
  const headers = _.map(
    _.filter(columns, (_, cIdx) => cIdx >= colRange[0] && cIdx <= colRange[1]),
    "name"
  );
  let text = "";
  let currRow = rowRange[0] - 1;
  while (currRow <= rowRange[1] - 1) {
    const row = data["" + currRow];
    text += _.join(
      _.map(headers, col => _.get(row, [col, "raw"], "")),
      "\t"
    );
    text += "\n";
    currRow++;
  }
  return { text, headers };
}

export function buildColumnCopyText(dataId, columns, start, end, callback) {
  const selectedColumns = _.filter(columns, c => (c.index >= start || c.index <= end) && c.visible);
  const headers = _.map(selectedColumns, "name");
  const postCallback = text => callback({ text, headers });
  try {
    $.post(`/dtale/build-column-copy/${dataId}`, { columns: JSON.stringify(headers) }, postCallback);
  } catch (e) {
    logException(e, e.stack);
  }
}
