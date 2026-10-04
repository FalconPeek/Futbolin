/* @ds-bundle: {"format":4,"namespace":"Picado","components":[{"name":"Button"},{"name":"Input"},{"name":"Badge"},{"name":"Card"},{"name":"FormBadge"},{"name":"PlayerCard"},{"name":"StandingsTable"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(" ");
  }
  function omit(obj, keys) {
    var o = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) o[k] = obj[k];
    return o;
  }

  function Button(props) {
    var variant = props.variant || "primary";
    var size = props.size || "md";
    var rest = omit(props, ["variant", "size", "block", "className", "children", "type"]);
    return h("button", Object.assign({
      type: props.type || "button",
      className: cx("pc-btn", "pc-btn--" + variant, "pc-btn--" + size, props.block && "pc-btn--block", props.className)
    }, rest), props.children);
  }

  function Input(props) {
    var autoId = React.useId();
    var id = props.id || autoId;
    var hintId = id + "-hint";
    var msg = props.error || props.hint;
    var rest = omit(props, ["label", "hint", "error", "id", "className"]);
    return h("div", { className: cx("pc-field", props.error && "pc-field--error", props.className) },
      props.label ? h("label", { className: "pc-field__label", htmlFor: id }, props.label) : null,
      h("input", Object.assign({
        id: id,
        className: "pc-input",
        "aria-invalid": props.error ? true : undefined,
        "aria-describedby": msg ? hintId : undefined
      }, rest)),
      msg ? h("p", { id: hintId, className: "pc-field__hint" }, msg) : null
    );
  }

  function Badge(props) {
    var variant = props.variant || "neutral";
    return h("span", { className: cx("pc-badge", "pc-badge--" + variant, props.className) }, props.children);
  }

  function Card(props) {
    var hasHead = props.title || props.subtitle || props.action;
    return h("section", { className: cx("pc-card", props.className) },
      hasHead ? h("header", { className: "pc-card__head" },
        h("div", null,
          props.title ? h("h3", { className: "pc-card__title" }, props.title) : null,
          props.subtitle ? h("p", { className: "pc-card__subtitle" }, props.subtitle) : null
        ),
        props.action ? h("div", { className: "pc-card__action" }, props.action) : null
      ) : null,
      props.children
    );
  }

  var FORM_LABEL = { G: "Ganado", E: "Empatado", P: "Perdido" };
  function FormBadge(props) {
    var r = props.result;
    return h("span", { className: cx("pc-form", "pc-form--" + r), title: FORM_LABEL[r], "aria-label": FORM_LABEL[r] }, r);
  }

  var FIELD_STATS = ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"];
  var GK_STATS = ["DIV", "HAN", "KIC", "REF", "POS", "SPD"];
  function tierFor(p) {
    if (p.tier) return p.tier;
    if (p.provisional) return "provisional";
    if (p.mvp || p.ovr >= 85) return "special";
    if (p.ovr >= 75) return "gold";
    if (p.ovr >= 65) return "silver";
    return "bronze";
  }
  var TIER_LABEL = { bronze: "Bronce", silver: "Plata", gold: "Oro", special: "Especial", provisional: "Provisional" };
  function initials(name) {
    return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(function (s) { return s[0]; }).join("").toUpperCase();
  }
  function PlayerCard(props) {
    var tier = tierFor(props);
    var labels = props.goalkeeper ? GK_STATS : FIELD_STATS;
    var stats = props.stats || {};
    var styles = (props.playStyles || []).slice(0, 3);
    return h("article", {
      className: cx("pc-pcard", "pc-pcard--" + tier, props.size === "sm" && "pc-pcard--sm", props.className),
      "aria-label": props.name + ", " + props.position + ", OVR " + props.ovr + ", nivel " + TIER_LABEL[tier]
    },
      h("div", { className: "pc-pcard__top" },
        h("div", { className: "pc-pcard__rating" },
          h("span", { className: "pc-pcard__ovr" }, props.provisional ? "–" : props.ovr),
          h("span", { className: "pc-pcard__pos" }, props.position)
        ),
        props.photoUrl
          ? h("img", { className: "pc-pcard__photo", src: props.photoUrl, alt: "" })
          : h("span", { className: "pc-pcard__photo pc-pcard__photo--initials", "aria-hidden": true }, initials(props.name))
      ),
      h("h3", { className: "pc-pcard__name" }, props.name),
      h("dl", { className: "pc-pcard__stats" },
        labels.map(function (l) {
          return h("div", { key: l, className: "pc-pcard__stat" },
            h("dt", null, l),
            h("dd", null, stats[l] != null ? stats[l] : "–"));
        })
      ),
      styles.length ? h("ul", { className: "pc-pcard__styles" },
        styles.map(function (s) {
          var plus = typeof s === "object" && s.plus;
          var label = typeof s === "object" ? s.label : s;
          return h("li", { key: label, className: cx("pc-pcard__style", plus && "pc-pcard__style--plus") }, label + (plus ? "+" : ""));
        })
      ) : null,
      tier === "provisional" ? h("p", { className: "pc-pcard__note" }, "Provisional · faltan votos") : null,
      props.mvp ? h("p", { className: "pc-pcard__note" }, "MVP último partido") : null
    );
  }

  function StandingsTable(props) {
    var rows = props.rows || [];
    var qualify = props.qualify || 0;
    var showBh = props.showBuchholz != null ? props.showBuchholz : rows.some(function (r) { return r.buchholz != null; });
    var showForm = rows.some(function (r) { return r.form && r.form.length; });
    var cols = ["PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"];
    var head = [h("th", { key: "pos", className: "pc-table__pos", scope: "col" }, "#"),
      h("th", { key: "team", className: "pc-table__team", scope: "col" }, props.teamLabel || "Equipo")]
      .concat(cols.map(function (c) { return h("th", { key: c, scope: "col", className: c === "Pts" ? "pc-table__pts" : null }, c); }))
      .concat(showBh ? [h("th", { key: "bh", scope: "col", title: "Buchholz" }, "Bh")] : [])
      .concat(showForm ? [h("th", { key: "form", scope: "col", className: "pc-table__formh" }, "Forma")] : []);
    return h("div", { className: cx("pc-table-wrap", props.className) },
      h("table", { className: "pc-table" },
        props.caption ? h("caption", null, props.caption) : null,
        h("thead", null, h("tr", null, head)),
        h("tbody", null, rows.map(function (r, i) {
          var dg = r.gf - r.gc;
          var pos = r.pos || i + 1;
          return h("tr", { key: r.id || r.name, className: cx(qualify && pos <= qualify && "pc-table__row--q", qualify && pos === qualify && "pc-table__row--cut") },
            h("td", { className: "pc-table__pos" }, pos),
            h("th", { scope: "row", className: "pc-table__team" },
              h("span", { className: "pc-table__teamcell" },
                h("span", { className: "pc-table__crest", style: r.color ? { background: r.color } : null, "aria-hidden": true }),
                h("span", { className: "pc-table__name" }, r.name))),
            h("td", null, r.pj), h("td", null, r.g), h("td", null, r.e), h("td", null, r.p),
            h("td", null, r.gf), h("td", null, r.gc),
            h("td", null, dg > 0 ? "+" + dg : dg),
            h("td", { className: "pc-table__pts" }, r.pts),
            showBh ? h("td", null, r.buchholz != null ? r.buchholz : "–") : null,
            showForm ? h("td", { className: "pc-table__form" }, (r.form || []).slice(-5).map(function (f, j) { return h(FormBadge, { key: j, result: f }); })) : null
          );
        }))
      )
    );
  }

  window.Picado = {
    Button: Button,
    Input: Input,
    Badge: Badge,
    Card: Card,
    FormBadge: FormBadge,
    PlayerCard: PlayerCard,
    StandingsTable: StandingsTable
  };
})();
