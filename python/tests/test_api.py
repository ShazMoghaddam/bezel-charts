"""The friendly layer: DataFrames, Series, arrays, dicts and lists in, Chart objects out."""

from __future__ import annotations

import datetime as dt
import re

import pytest

import bezel_charts as bc

pd = pytest.importorskip("pandas")
np = pytest.importorskip("numpy")


def ids(svg: str) -> str:
    """Gradient ids are random so charts can share a page; ignore them when comparing."""
    return re.sub(r"bzcg[0-9a-z]+", "id", svg)


def texts(svg: str) -> list[str]:
    return re.findall(r"<text[^>]*>([^<]*)</text>", svg)


def test_list_and_kwargs_match_render():
    chart = bc.spark([4, 6, 5, 8], heading="Signups", show_values=True)
    assert ids(chart.svg) == ids(bc.to_svg("spark", values=[4, 6, 5, 8], heading="Signups", show_values=True))


def test_option_spellings_are_equivalent():
    a = bc.to_svg("line", values="1,2,3", show_values=True, goal_label="Aim", goal=2)
    b = bc.to_svg("line", {"values": "1,2,3", "show-values": True, "goal-label": "Aim", "goal": 2})
    c = bc.to_svg("line", values="1,2,3", showValues=True, goalLabel="Aim", goal=2)
    assert ids(a) == ids(b) == ids(c)


def test_dataframe_with_x_and_several_y_columns():
    df = pd.DataFrame({"month": ["Jan", "Feb", "Mar"], "sales": [10, 14, 12], "costs": [8, 9, 11]})
    svg = bc.line(df, x="month", y=["sales", "costs"]).svg
    assert {"sales", "costs", "Jan", "Mar"} <= set(texts(svg))


def test_dataframe_defaults_to_numeric_columns():
    df = pd.DataFrame({"name": ["a", "b"], "x": [1, 2], "y": [3.5, 4.5]})
    chart = bc.line(df)
    assert "2 series" in chart.svg


def test_datetime_index_becomes_dates_and_x_format():
    idx = pd.date_range("2026-01-01", periods=3, freq="MS")
    s = pd.Series([1, 2, 3], index=idx)
    assert "2026-01-01" in texts(bc.line(s).svg)
    assert "Jan 2026" in texts(bc.line(s, x_format="%b %Y").svg)


def test_series_numpy_and_list_draw_the_same():
    a = bc.spark([1.5, 2.5, 2.0]).svg
    b = bc.spark(np.array([1.5, 2.5, 2.0])).svg
    c = bc.spark(pd.Series([1.5, 2.5, 2.0])).svg
    assert ids(a) == ids(b) == ids(c)


def test_dict_and_list_of_lists_make_series():
    assert "Team A" in texts(bc.line({"Team A": [1, 2], "Team B": [2, 1]}).svg)
    assert "2 series" in bc.line([[1, 2, 3], [3, 2, 1]]).svg


def test_missing_values_warn_and_draw_as_zero():
    with pytest.warns(UserWarning, match="1 missing"):
        chart = bc.spark(pd.Series([1.0, None, 3.0]))
    assert "latest 3" in chart.svg


def test_notes_from_a_dict():
    chart = bc.line([1, 3, 2], labels=["Jan", "Feb", "Mar"], notes={"Feb": "Launch", 2: "Calm"})
    assert {"Launch", "Calm"} <= set(texts(chart.svg))
    with pytest.raises(ValueError):
        bc.line([1, 2], notes={"a": "b;c"})


def test_sparkline_needs_one_column():
    df = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
    with pytest.raises(ValueError, match="one column"):
        bc.spark(df)
    assert "latest 4" in bc.spark(df, y="b").svg


def test_unknown_columns_and_types():
    df = pd.DataFrame({"a": [1, 2]})
    with pytest.raises(KeyError):
        bc.line(df, y="nope")
    with pytest.raises(NotImplementedError, match="later release"):
        bc.to_svg("donut", values="1,2")
    with pytest.raises(NotImplementedError, match="later release"):
        bc.to_svg("ring", values="50")
    with pytest.raises(ValueError, match="unknown chart type"):
        bc.to_svg("pie")
    with pytest.raises(AttributeError, match="later release"):
        bc.donut  # noqa: B018


def test_chart_object(tmp_path):
    chart = bc.line([1, 2, 3], heading="Demo", theme="light")
    assert chart._repr_svg_() == str(chart) == chart.svg
    assert repr(chart) == f"<bezel_charts.Chart line {chart.width}x{chart.height}>"
    out = chart.save(tmp_path / "demo")
    assert out.name == "demo.svg" and out.read_text(encoding="utf-8") == chart.svg
    assert 'class="bzc-hit"' not in chart.svg and "data-tip" not in chart.svg


def test_dates_as_python_objects():
    chart = bc.line(pd.DataFrame({"d": [dt.date(2026, 3, 1), dt.date(2026, 3, 2)], "v": [1, 2]}), x="d")
    assert "2026-03-01" in texts(chart.svg)


def test_unique_gradient_ids_for_notebooks():
    a, b = bc.spark([1, 2]).svg, bc.spark([1, 2]).svg
    assert re.search(r'id="(bzcg[^"]+)"', a).group(1) != re.search(r'id="(bzcg[^"]+)"', b).group(1)


def test_unsupported_lang_warns_once_and_falls_back():
    with pytest.warns(UserWarning, match="fr-FR"):
        bc.to_svg("spark", values="1,2", lang="fr-FR")


def test_bars_from_value_counts():
    s = pd.Series(["Python", "Go", "Python", "Rust", "Python", "Go"]).value_counts()
    svg = bc.bars(s, horizontal=True).svg
    assert {"Python", "Go", "Rust"} <= set(texts(svg))
    assert "highest Python 3" in svg


def test_grouped_bars_from_a_dataframe():
    df = pd.DataFrame({"quarter": ["Q1", "Q2", "Q3"], "2026": [4, 9, 6], "2025": [3, 7, 8]})
    chart = bc.bars(df, x="quarter", show_values=True)
    assert "2 series across 3 groups" in chart.svg
    assert {"2026", "2025", "Q1", "Q3"} <= set(texts(chart.svg))
    assert ids(chart.svg) == ids(
        bc.to_svg("bars", values="4,9,6|3,7,8", series="2026,2025", labels="Q1,Q2,Q3", show_values=True)
    )


def test_bars_highlight_and_colours():
    single = bc.bars([2, 5, 3]).svg
    assert single.count('fill-opacity="0.5"') == 2 and single.count('fill-opacity="1"') == 1
    assert 'fill-opacity="0.5"' not in bc.bars([2, 5, 3], highlight="none").svg
    assert "#ff0000" in bc.bars([1, 2], color=["#ff0000", "#00ff00"]).svg


def test_scatter_from_a_dataframe_with_groups_labels_and_trend():
    df = pd.DataFrame({
        "hours": [1, 2, 3, 4, 5, 2.5], "score": [52, 61, 70, 68, 85, None],
        "team": ["A", "A", "B", "B", "B", "A"], "name": list("pqrstu"),
    })
    with pytest.warns(UserWarning, match="1 point with a missing x or y was left out"):
        chart = bc.scatter(df, x="hours", y="score", by="team", label="name", trend=True, notes={"t": "Best"})
    assert "5 points in 2 groups" in chart.svg
    assert {"A", "B", "hours", "score", "Best", "r = 1.00", "r = 0.81"} <= set(texts(chart.svg))
    titled = bc.scatter(df.dropna(), x="hours", y="score", x_label="Study hours")
    assert "Study hours" in texts(titled.svg)


def test_scatter_from_lists_matches_render():
    chart = bc.scatter(x=[1, 2, 3, 4, 5], y=[2, 4, 5, 4, 6], trend=True)
    assert ids(chart.svg) == ids(bc.to_svg("scatter", x="1,2,3,4,5", y="2,4,5,4,6", trend=""))
    grouped = bc.scatter(x=[[1, 2], [3, 4]], y=[[5, 6], [7, 8]], series=["Red", "Blue"])
    assert "4 points in 2 groups" in grouped.svg


def test_scatter_needs_both_axes():
    with pytest.raises(TypeError):
        bc.scatter(x=[1, 2])
    with pytest.raises(TypeError):
        bc.scatter(pd.DataFrame({"a": [1]}), x="a")


def test_fit_matches_numpy():
    from bezel_charts.charts.scatter import fit

    xs, ys = [1.0, 2.0, 4.0, 7.0], [2.0, 3.5, 4.0, 9.0]
    f = fit(xs, ys)
    slope, intercept = np.polyfit(xs, ys, 1)
    assert f["slope"] == pytest.approx(slope) and f["intercept"] == pytest.approx(intercept)
    assert f["r"] == pytest.approx(np.corrcoef(xs, ys)[0, 1])
    assert fit([1, 1], [2, 3]) is None and fit([1], [1]) is None


def test_heatmap_counts_dates_and_fills_gaps():
    dates = pd.Series(pd.to_datetime(["2026-10-01", "2026-10-01", "2026-10-03"]))
    chart = bc.heatmap(dates)
    assert "3 across 3 days" in chart.svg
    assert ids(chart.svg) == ids(bc.to_svg("heatmap", values=[2, 0, 1], start="2026-10-01"))


def test_heatmap_from_dataframe_series_and_list():
    df = pd.DataFrame({"day": ["2026-03-01", "2026-03-04"], "km": [5.0, 8.0]})
    by_column = bc.heatmap(df, x="day", y="km", suffix=" km")
    assert "13 km across 4 days" in by_column.svg
    indexed = bc.heatmap(pd.Series([5.0, 8.0], index=pd.to_datetime(["2026-03-01", "2026-03-04"])), suffix=" km")
    assert ids(indexed.svg) == ids(by_column.svg)
    plain = bc.heatmap([1, 2, 3], start=dt.date(2026, 1, 5))
    assert ids(plain.svg) == ids(bc.to_svg("heatmap", values="1,2,3", start="2026-01-05"))
    rows = bc.heatmap(pd.DataFrame({"when": pd.to_datetime(["2026-05-01 09:00", "2026-05-01 17:30"])}), x="when")
    assert "2 across 1 days" in rows.svg


def test_heatmap_dates_follow_the_locale():
    gb = bc.render("heatmap", values="1", start="2026-09-07")
    us = bc.render("heatmap", values="1", start="2026-09-07", lang="en-US")
    assert "Mon, 7 Sept 2026: 1" in gb and "Mon, Sep 7, 2026: 1" in us
    with pytest.raises(ValueError, match="real date"):
        bc.to_svg("heatmap", values="1", start="2026-13-01")
