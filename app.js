const storeKey = 'riskflow-iso31000-v1';
const today = new Date().toISOString().slice(0, 10);
const seed = {
  context: { orgName: '', scope: '', riskAppetite: 'Modérée', criticalThreshold: 15 },
  risks: [
    { id: crypto.randomUUID(), title: 'Indisponibilité du système de production', category: 'Opérationnel', owner: 'DSI', cause: 'Panne infrastructure ou cyberattaque', consequence: 'Arrêt des opérations et pénalités contractuelles', likelihood: 3, impact: 5, controls: 'Sauvegardes, supervision, PCA', treatment: 'Réduire', action: 'Tester le PCA chaque semestre et renforcer la redondance', status: 'En traitement' },
    { id: crypto.randomUUID(), title: 'Non-conformité réglementaire', category: 'Conformité', owner: 'Juridique', cause: 'Veille incomplète ou procédure obsolète', consequence: 'Sanctions, perte de confiance et coûts de remédiation', likelihood: 2, impact: 4, controls: 'Revue annuelle et référents métiers', treatment: 'Réduire', action: 'Mettre en place une veille mensuelle documentée', status: 'Surveillé' }
  ],
  incidents: []
};
let state = loadState();

function loadState() {
  const saved = localStorage.getItem(storeKey);
  return saved ? JSON.parse(saved) : seed;
}

function persist() {
  localStorage.setItem(storeKey, JSON.stringify(state));
  render();
}

const $ = id => document.getElementById(id);
const scoreOf = risk => Number(risk.likelihood) * Number(risk.impact);
const levelOf = score => score >= Number(state.context.criticalThreshold) ? 'Critique' : score >= 8 ? 'Modéré' : 'Faible';
const levelClass = level => level === 'Critique' ? 'high' : level === 'Modéré' ? 'medium' : 'low';

function render() {
  $('orgName').value = state.context.orgName || '';
  $('scope').value = state.context.scope || '';
  $('riskAppetite').value = state.context.riskAppetite || 'Modérée';
  $('criticalThreshold').value = state.context.criticalThreshold || 15;
  $('riskCount').textContent = state.risks.length;
  $('criticalCount').textContent = state.risks.filter(r => levelOf(scoreOf(r)) === 'Critique').length;
  $('openActionCount').textContent = state.risks.filter(r => r.status !== 'Clos' && r.action).length;
  $('openIncidentCount').textContent = state.incidents.filter(i => i.status !== 'Clos').length;
  renderRiskOptions();
  renderRisks();
  renderIncidents();
}

function renderRiskOptions() {
  const options = ['<option value="">Aucun risque lié</option>'].concat(state.risks.map(r => `<option value="${r.id}">${escapeHtml(r.title)}</option>`));
  $('incidentRisk').innerHTML = options.join('');
}

function renderRisks() {
  const query = $('riskSearch').value.toLowerCase();
  const rows = state.risks.filter(r => [r.title, r.category, r.owner, r.status].join(' ').toLowerCase().includes(query));
  $('riskTable').innerHTML = rows.map(r => {
    const score = scoreOf(r);
    const level = levelOf(score);
    return `<tr><td><strong>${escapeHtml(r.title)}</strong><br><small>${escapeHtml(r.owner || 'Sans propriétaire')}</small></td><td>${escapeHtml(r.category)}</td><td>${score}</td><td><span class="badge ${levelClass(level)}">${level}</span></td><td>${escapeHtml(r.treatment)}</td><td>${escapeHtml(r.status)}</td><td><div class="row-actions"><button class="btn ghost mini" onclick="editRisk('${r.id}')">Modifier</button><button class="btn ghost mini" onclick="deleteRisk('${r.id}')">Supprimer</button></div></td></tr>`;
  }).join('') || '<tr><td colspan="7">Aucun risque enregistré.</td></tr>';
}

function renderIncidents() {
  $('incidentList').innerHTML = state.incidents.map(i => {
    const linked = state.risks.find(r => r.id === i.riskId)?.title || 'Non lié';
    return `<article class="incident"><header><h3>${escapeHtml(i.title)}</h3><span class="badge ${i.status === 'Clos' ? 'low' : 'medium'}">${escapeHtml(i.status)}</span></header><p><strong>${escapeHtml(i.severity)}</strong> • ${escapeHtml(i.date || '')} • Risque : ${escapeHtml(linked)}</p><p>${escapeHtml(i.description || '')}</p><div class="row-actions"><button class="btn ghost mini" onclick="editIncident('${i.id}')">Modifier</button><button class="btn ghost mini" onclick="deleteIncident('${i.id}')">Supprimer</button></div></article>`;
  }).join('') || '<p>Aucun incident. Déclarez les événements pour alimenter le retour d’expérience.</p>';
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function readRiskForm() {
  return { id: $('riskId').value || crypto.randomUUID(), title: $('riskTitle').value, category: $('riskCategory').value, owner: $('riskOwner').value, cause: $('riskCause').value, consequence: $('riskConsequence').value, likelihood: $('riskLikelihood').value, impact: $('riskImpact').value, controls: $('riskControls').value, treatment: $('riskTreatment').value, action: $('riskAction').value, status: $('riskStatus').value };
}

function readIncidentForm() {
  return { id: $('incidentId').value || crypto.randomUUID(), title: $('incidentTitle').value, riskId: $('incidentRisk').value, severity: $('incidentSeverity').value, date: $('incidentDate').value || today, description: $('incidentDescription').value, response: $('incidentResponse').value, rootCause: $('incidentRootCause').value, corrective: $('incidentCorrective').value, status: $('incidentStatus').value };
}

$('saveContextBtn').addEventListener('click', () => { state.context = { orgName: $('orgName').value, scope: $('scope').value, riskAppetite: $('riskAppetite').value, criticalThreshold: Number($('criticalThreshold').value) }; persist(); });
$('riskForm').addEventListener('submit', event => { event.preventDefault(); const risk = readRiskForm(); state.risks = state.risks.some(r => r.id === risk.id) ? state.risks.map(r => r.id === risk.id ? risk : r) : [risk, ...state.risks]; event.target.reset(); $('riskId').value = ''; persist(); });
$('incidentForm').addEventListener('submit', event => { event.preventDefault(); const incident = readIncidentForm(); state.incidents = state.incidents.some(i => i.id === incident.id) ? state.incidents.map(i => i.id === incident.id ? incident : i) : [incident, ...state.incidents]; event.target.reset(); $('incidentId').value = ''; persist(); });
$('resetRiskForm').addEventListener('click', () => { $('riskForm').reset(); $('riskId').value = ''; });
$('resetIncidentForm').addEventListener('click', () => { $('incidentForm').reset(); $('incidentId').value = ''; });
$('riskSearch').addEventListener('input', renderRisks);
$('printBtn').addEventListener('click', () => window.print());
$('exportJsonBtn').addEventListener('click', () => download('registre-risques-iso31000.json', JSON.stringify(state, null, 2), 'application/json'));
$('exportCsvBtn').addEventListener('click', () => download('registre-risques-iso31000.csv', toCsv(), 'text/csv'));
$('importJsonInput').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; state = JSON.parse(await file.text()); persist(); event.target.value = ''; });

function editRisk(id) { const r = state.risks.find(item => item.id === id); if (!r) return; Object.entries({ riskId: r.id, riskTitle: r.title, riskCategory: r.category, riskOwner: r.owner, riskCause: r.cause, riskConsequence: r.consequence, riskLikelihood: r.likelihood, riskImpact: r.impact, riskControls: r.controls, riskTreatment: r.treatment, riskAction: r.action, riskStatus: r.status }).forEach(([id, value]) => $(id).value = value || ''); scrollTo({ top: 420, behavior: 'smooth' }); }
function deleteRisk(id) { if (confirm('Supprimer ce risque ?')) { state.risks = state.risks.filter(r => r.id !== id); persist(); } }
function editIncident(id) { const i = state.incidents.find(item => item.id === id); if (!i) return; Object.entries({ incidentId: i.id, incidentTitle: i.title, incidentRisk: i.riskId, incidentSeverity: i.severity, incidentDate: i.date, incidentDescription: i.description, incidentResponse: i.response, incidentRootCause: i.rootCause, incidentCorrective: i.corrective, incidentStatus: i.status }).forEach(([id, value]) => $(id).value = value || ''); }
function deleteIncident(id) { if (confirm('Supprimer cet incident ?')) { state.incidents = state.incidents.filter(i => i.id !== id); persist(); } }

function download(filename, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = Object.assign(document.createElement('a'), { href: url, download: filename }); a.click(); URL.revokeObjectURL(url); }
function toCsv() { const header = ['Risque','Catégorie','Propriétaire','Score','Niveau','Traitement','Statut','Plan action']; const rows = state.risks.map(r => [r.title, r.category, r.owner, scoreOf(r), levelOf(scoreOf(r)), r.treatment, r.status, r.action]); return [header, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"','""')}"`).join(',')).join('\n'); }

window.editRisk = editRisk; window.deleteRisk = deleteRisk; window.editIncident = editIncident; window.deleteIncident = deleteIncident;
render();
