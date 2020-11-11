import _ from "lodash";
import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";

import actions from "../actions/dtale";
import menuUtils from "../menuUtils";
import bu from "./backgroundUtils";
import { ignoreMenuClicks } from "./column/ColumnMenu";
import { exports as gu } from "./gridUtils";
import { DataViewerMenuHolder } from "./menu/DataViewerMenuHolder";
import { buildColumnCopyText, isInColumnRange } from "./rangeSelectUtils";

const SORT_CHARS = {
  ASC: String.fromCharCode("9650"),
  DESC: String.fromCharCode("9660"),
};

function buildMarkup(colCfg, colName, backgroundMode) {
  let headerStyle = {};
  let className = "";
  let colNameMarkup = colName;
  if (backgroundMode === "dtypes") {
    const dtypeStyle = bu.dtypeHighlighting(colCfg);
    headerStyle = _.assignIn(dtypeStyle, headerStyle);
    colNameMarkup = <div title={`DType: ${colCfg.dtype}`}>{colName}</div>;
    className = _.size(dtypeStyle) ? " background" : "";
  }
  if (backgroundMode === "missing" && colCfg.hasMissing) {
    colNameMarkup = <div title={`Missing Values: ${colCfg.hasMissing}`}>{`${bu.missingIcon}${colName}`}</div>;
    className = " background";
  }
  if (backgroundMode === "outliers" && colCfg.hasOutliers) {
    colNameMarkup = <div title={`Outliers: ${colCfg.hasOutliers}`}>{`${bu.outlierIcon} ${colName}`}</div>;
    className = " background";
  }
  if (backgroundMode === "lowVariance" && colCfg.lowVariance) {
    colNameMarkup = <div title={`Low Variance: ${colCfg.lowVariance}`}>{`${bu.flagIcon} ${colName}`}</div>;
    className = " background";
  }
  return { headerStyle, colNameMarkup, className };
}

class ReactHeader extends React.Component {
  constructor(props) {
    super(props);
    this.handleMouseOver = this.handleMouseOver.bind(this);
  }

  shouldComponentUpdate(newProps) {
    return !_.isEqual(this.props, newProps);
  }

  handleMouseOver(e) {
    const { gridState, columnIndex } = this.props;
    const columnRange = _.get(gridState, "columnRange");
    const rangeExists = columnRange && columnRange.start;
    if (e.shiftKey) {
      if (rangeExists) {
        this.props.propagateState({
          columnRange: { ...columnRange, end: columnIndex },
          rangeSelect: null,
        });
      }
    } else if (rangeExists) {
      this.props.propagateState({ columnRange: null, rangeSelect: null });
    }
  }

  render() {
    const { columnIndex, dataId, style, gridState, toggleColumnMenu, hideColumnMenu } = this.props;
    const { columns, sortInfo, backgroundMode, columnRange } = gridState;
    if (columnIndex == 0) {
      return <DataViewerMenuHolder {...this.props} />;
    }
    const colCfg = gu.getCol(columnIndex, gridState);
    const colName = _.get(colCfg, "name");
    const toggleId = gu.buildToggleId(colName);
    const menuHandler = menuUtils.openMenu(
      `${colName}Actions`,
      () => toggleColumnMenu(colName, toggleId),
      () => hideColumnMenu(colName),
      `div.${toggleId}`,
      ignoreMenuClicks
    );
    const copyHandler = e => {
      if (e.shiftKey) {
        if (columnRange) {
          const title = "Copy Columns to Clipboard?";
          const callback = copyText =>
            this.props.openChart({
              ...copyText,
              type: "copy-column-range",
              title,
              size: "modal-sm",
              ...this.props,
            });
          buildColumnCopyText(dataId, columns, columnRange.start, columnIndex, callback);
        } else {
          this.props.propagateState({
            columnRange: { start: columnIndex },
            rangeSelect: null,
          });
        }
        return;
      }
      if (e.ctrlKey) {
        return;
      }
      menuHandler(e);
    };
    const sortDir = (_.find(sortInfo, ([col, _dir]) => col === colName) || [null, null])[1];
    let headerStyle = _.assignIn({}, style);
    const markupProps = buildMarkup(colCfg, colName, backgroundMode);
    headerStyle = { ...headerStyle, ...markupProps.headerStyle };
    const rangeClass = isInColumnRange(columnIndex, columnRange) ? " in-range" : "";
    return (
      <div
        className={`headerCell ${toggleId}${markupProps.className}${rangeClass}`}
        style={headerStyle}
        onClick={copyHandler}
        onMouseOver={this.handleMouseOver}>
        <div className="text-nowrap">
          {_.get(SORT_CHARS, sortDir, "")}
          {markupProps.colNameMarkup}
        </div>
      </div>
    );
  }
}
ReactHeader.displayName = "ReactHeader";
ReactHeader.propTypes = {
  dataId: PropTypes.string,
  gridState: PropTypes.shape({
    columns: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/no-unused-prop-types
    columnFormats: PropTypes.object,
    sortInfo: PropTypes.arrayOf(PropTypes.array),
    menuOpen: PropTypes.bool,
    rowCount: PropTypes.number,
    backgroundMode: PropTypes.string,
    rangeHighlight: PropTypes.object,
    rangeSelect: PropTypes.object,
    columnRange: PropTypes.object,
  }),
  columnIndex: PropTypes.number,
  style: PropTypes.object,
  propagateState: PropTypes.func,
  openChart: PropTypes.func,
  toggleColumnMenu: PropTypes.func,
  hideColumnMenu: PropTypes.func,
};

const ReduxHeader = connect(
  ({ dataId }) => ({ dataId }),
  dispatch => ({
    toggleColumnMenu: (colName, toggleId) => dispatch(actions.toggleColumnMenu(colName, toggleId)),
    hideColumnMenu: colName => dispatch(actions.hideColumnMenu(colName)),
  })
)(ReactHeader);

export { ReduxHeader as Header, ReactHeader };
