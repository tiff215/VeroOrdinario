"""Front-end Flask de NutriTrack. Consume la API REST en TypeScript."""
import os
from datetime import date
from functools import wraps

import requests
from dotenv import load_dotenv
from flask import Flask, flash, redirect, render_template, request, session, url_for

load_dotenv()
API = os.getenv("API_URL", "http://localhost:3000/api")
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "cambia-esto")

MOMENTOS = [("desayuno", "Desayuno"), ("colacion_am", "Colación AM"), ("comida", "Comida"),
            ("colacion_pm", "Colación PM"), ("cena", "Cena")]
MACROS = ["calorias", "proteinas", "carbohidratos", "grasas"]
NUTR = MACROS + ["fibra"]


# ---------- utilidades ----------
def num(x):
    try:
        return float(x or 0)  # PostgreSQL devuelve NUMERIC como texto
    except (TypeError, ValueError):
        return 0.0


@app.template_filter("n0")
def n0(x): return f"{num(x):,.0f}"


@app.template_filter("n1")
def n1(x): return f"{num(x):,.1f}"


def api(method, path, **kw):
    headers = {"Authorization": f"Bearer {session.get('token', '')}"}
    try:
        r = requests.request(method, API + path, headers=headers, timeout=60, **kw)
        try:
            data = r.json()
        except ValueError:
            data = {}
        if r.status_code == 401 and session.get("token"):
            session.clear()
        return data, r.status_code
    except requests.RequestException:
        return {"error": "No se pudo conectar con el servidor. Verifica que la API esté encendida."}, 503


def err(d):
    return (d or {}).get("error") or (d or {}).get("message") or "Ocurrió un error. Intenta de nuevo."


def login_required(rol=None):
    def deco(f):
        @wraps(f)
        def w(*a, **k):
            u = session.get("usuario")
            if not u:
                return redirect(url_for("login"))
            if rol and u["rol"] != rol:
                flash("No tienes permiso para ver esa sección.", "error")
                return redirect(url_for("index"))
            return f(*a, **k)
        return w
    return deco


@app.context_processor
def globales():
    pend = 0
    u = session.get("usuario")
    if u and u["rol"] == "cliente":
        d, s = api("GET", "/notificaciones")
        if s == 200 and isinstance(d, list):
            pend = sum(1 for n in d if not n.get("leida"))
    return {"pendientes": pend, "momentos": MOMENTOS, "hoy": date.today().isoformat()}


# ---------- autenticación ----------
@app.route("/")
def index():
    u = session.get("usuario")
    if not u:
        return redirect(url_for("login"))
    return redirect(url_for("admin_alimentos" if u["rol"] == "admin" else "dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        d, s = api("POST", "/auth/login", json={"email": request.form["email"].strip(),
                                                "password": request.form["password"]})
        if s == 200:
            session["token"], session["usuario"] = d["token"], d["usuario"]
            return redirect(url_for("index"))
        flash(err(d), "error")
    return render_template("login.html")


@app.route("/registro", methods=["GET", "POST"])
def registro():
    if request.method == "POST":
        f = request.form
        if len(f["password"]) < 6:
            flash("La contraseña debe tener al menos 6 caracteres.", "error")
        else:
            d, s = api("POST", "/auth/registro", json={"nombre": f["nombre"].strip(),
                                                       "email": f["email"].strip(), "password": f["password"]})
            if s in (200, 201):
                flash("Cuenta creada. Ya puedes iniciar sesión.", "ok")
                return redirect(url_for("login"))
            flash(err(d), "error")
    return render_template("registro.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# ---------- cliente ----------
@app.route("/dashboard")
@login_required("cliente")
def dashboard():
    fecha = request.args.get("fecha") or date.today().isoformat()
    regs, s = api("GET", "/registros", params={"fecha": fecha})
    if s != 200 or not isinstance(regs, list):
        flash(err(regs), "error")
        regs = []
    obj, so = api("GET", "/objetivos")
    obj = obj if so == 200 and "calorias" in obj else None

    grupos = {k: [] for k, _ in MOMENTOS}
    tot = dict.fromkeys(MACROS, 0.0)
    for r in regs:
        grupos.setdefault(r["momento"], []).append(r)
        for k in MACROS:
            tot[k] += num(r.get(k))
    pct = {k: round(tot[k] / num(obj[k]) * 100) if obj and num(obj[k]) else 0 for k in MACROS}
    return render_template("dashboard.html", fecha=fecha, grupos=grupos, tot=tot, obj=obj, pct=pct)


@app.route("/buscar")
@login_required("cliente")
def buscar():
    q = request.args.get("q", "").strip()
    d, s = api("GET", "/alimentos", params={"q": q})
    if s != 200:
        flash(err(d), "error")
    return render_template("buscar.html", q=q, alimentos=d if s == 200 else [],
                           momento=request.args.get("momento", "comida"),
                           fecha=request.args.get("fecha", date.today().isoformat()))


@app.route("/registrar", methods=["POST"])
@login_required("cliente")
def registrar():
    f = request.form
    porciones = num(f.get("porciones"))
    if porciones <= 0:
        flash("Las porciones deben ser mayores a 0.", "error")
        return redirect(request.referrer or url_for("buscar"))
    d, s = api("POST", "/registros", json={"alimentoId": int(f["alimento_id"]), "momento": f["momento"],
                                           "porciones": porciones, "fecha": f["fecha"]})
    flash("Alimento registrado." if s in (200, 201) else err(d), "ok" if s in (200, 201) else "error")
    return redirect(url_for("dashboard", fecha=f["fecha"]))


@app.route("/registros/<int:rid>/eliminar", methods=["POST"])
@login_required("cliente")
def eliminar_registro(rid):
    d, s = api("DELETE", f"/registros/{rid}")
    if s not in (200, 204):
        flash(err(d), "error")
    return redirect(url_for("dashboard", fecha=request.form.get("fecha", date.today().isoformat())))


@app.route("/objetivos", methods=["GET", "POST"])
@login_required("cliente")
def objetivos():
    if request.method == "POST":
        body = {k: num(request.form.get(k)) for k in MACROS}
        if any(v <= 0 for v in body.values()):
            flash("Todos los objetivos deben ser mayores a 0.", "error")
        else:
            d, s = api("PUT", "/objetivos", json=body)
            flash("Objetivos actualizados." if s == 200 else err(d), "ok" if s == 200 else "error")
            if s == 200:
                return redirect(url_for("objetivos"))
    obj, s = api("GET", "/objetivos")
    return render_template("objetivos.html", obj=obj if s == 200 and "calorias" in obj else {})


@app.route("/seguimiento")
@login_required("cliente")
def seguimiento():
    dias = request.args.get("dias", 7, type=int)
    dias = dias if dias in (7, 14, 30) else 7
    d, s = api("GET", "/seguimiento", params={"dias": dias})
    if s != 200:
        flash(err(d), "error")
        d = {}
    cumpl = d.get("cumplimiento", {})
    tend = d.get("tendencia", {})
    macros = d.get("macros", {})
    chart = {"labels": sorted(cumpl), "cumpl": [cumpl[k] for k in sorted(cumpl)],
             "serie": tend.get("serie", []), "meta": tend.get("meta", 0),
             "macros": [macros.get("proteinas", 0), macros.get("carbohidratos", 0), macros.get("grasas", 0)]}
    return render_template("seguimiento.html", dias=dias, tend=tend, chart=chart, hay_datos=bool(cumpl))


@app.route("/notificaciones")
@login_required("cliente")
def notificaciones():
    d, s = api("GET", "/notificaciones")
    if s != 200:
        flash(err(d), "error")
    return render_template("notificaciones.html", notis=d if s == 200 else [])


@app.route("/notificaciones/<int:nid>/leida", methods=["POST"])
@login_required("cliente")
def marcar_leida(nid):
    api("PATCH", f"/notificaciones/{nid}/leida")
    return redirect(url_for("notificaciones"))


# ---------- administrador ----------
def payload_alimento(f):
    p = {"nombre": f["nombre"].strip(), "tipo": f["tipo"], "porcion_g": num(f.get("porcion_g")) or 100,
         "etiquetas": [e.strip().lower() for e in f.get("etiquetas", "").split(",") if e.strip()]}
    for k in NUTR:
        p[k] = num(f.get(k))
    if p["tipo"] == "platillo":
        p["componentes"] = [{"id": int(i), "cantidad": num(c)}
                            for i, c in zip(f.getlist("comp_id"), f.getlist("comp_cant")) if i and num(c) > 0]
    return p


@app.route("/admin/alimentos")
@login_required("admin")
def admin_alimentos():
    q = request.args.get("q", "").strip()
    d, s = api("GET", "/admin/alimentos", params={"q": q})
    if s != 200:
        flash(err(d), "error")
    return render_template("admin_alimentos.html", alimentos=d if s == 200 else [], q=q)


@app.route("/admin/alimentos/nuevo", methods=["GET", "POST"])
@app.route("/admin/alimentos/<int:aid>/editar", methods=["GET", "POST"])
@login_required("admin")
def admin_form(aid=None):
    if request.method == "POST":
        p = payload_alimento(request.form)
        if not p["nombre"]:
            flash("El nombre es obligatorio.", "error")
        elif any(p[k] < 0 for k in NUTR):
            flash("Los valores nutricionales no pueden ser negativos.", "error")
        elif p["tipo"] == "platillo" and not p["componentes"]:
            flash("Un platillo necesita al menos un ingrediente.", "error")
        else:
            d, s = api("PUT" if aid else "POST", f"/admin/alimentos/{aid}" if aid else "/admin/alimentos", json=p)
            if s in (200, 201):
                flash("Alimento guardado.", "ok")
                return redirect(url_for("admin_alimentos"))
            flash(err(d), "error")
    a = {}
    if aid:
        a, s = api("GET", f"/admin/alimentos/{aid}")
        if s != 200:
            flash(err(a), "error")
            return redirect(url_for("admin_alimentos"))
    todos, _ = api("GET", "/admin/alimentos")
    simples = [x for x in todos if x.get("tipo") == "simple" and x.get("id") != aid] if isinstance(todos, list) else []
    return render_template("admin_form.html", a=a, simples=simples)


@app.route("/admin/alimentos/<int:aid>/eliminar", methods=["POST"])
@login_required("admin")
def admin_eliminar(aid):
    d, s = api("DELETE", f"/admin/alimentos/{aid}")
    flash("Alimento eliminado." if s in (200, 204) else err(d), "ok" if s in (200, 204) else "error")
    return redirect(url_for("admin_alimentos"))


@app.route("/admin/usuarios")
@login_required("admin")
def admin_usuarios():
    d, s = api("GET", "/admin/usuarios")
    if s != 200:
        flash(err(d), "error")
    return render_template("admin_usuarios.html", usuarios=d if s == 200 else [])


if __name__ == "__main__":
    app.run(port=5000, debug=True)
