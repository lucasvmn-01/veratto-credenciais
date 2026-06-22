import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// COLOQUE SUAS CHAVES DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyARhJQauF5mezlLRYdRMrN8uEApQBepbJQ",
  authDomain: "veratto-credenciais.firebaseapp.com",
  projectId: "veratto-credenciais",
  storageBucket: "veratto-credenciais.firebasestorage.app",
  messagingSenderId: "287469650046",
  appId: "1:287469650046:web:a142dd1ee283994e33d82f",
  measurementId: "G-7NH63YQDZ5"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentTab = 'self-service';
let currentSelectedUser = null;

// Máscaras (Exportadas para o escopo global)
window.maskCPF = function(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    val = val.replace(/(\d{3})(\d)/, '$1.$2');
    val = val.replace(/(\d{3})(\d)/, '$1.$2');
    val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    input.value = val;
}

window.maskPhone = function(input) {
    let val = input.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
    val = val.replace(/(\d)(\d{4})$/, '$1-$2');
    input.value = val;
}

window.switchTab = function(tab) {
    currentTab = tab;
    const selfServiceSec = document.getElementById('section-self-service');
    const loginSec = document.getElementById('section-admin-login');
    const dashboardSec = document.getElementById('section-admin-dashboard');

    const tabSelfBtn = document.getElementById('tab-self-service');
    const tabAdminBtn = document.getElementById('tab-admin');

    tabSelfBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-500 hover:text-slate-800";
    tabAdminBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-500 hover:text-slate-800";

    selfServiceSec.classList.add('hidden');
    loginSec.classList.add('hidden');
    dashboardSec.classList.add('hidden');

    if (tab === 'self-service') {
        tabSelfBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-white text-blue-700 shadow-sm border border-slate-200/50";
        selfServiceSec.classList.remove('hidden');
    } else {
        tabAdminBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-white text-blue-700 shadow-sm border border-slate-200/50";
        if (auth.currentUser) {
            dashboardSec.classList.remove('hidden');
            loadAdminDashboard();
        } else {
            loginSec.classList.remove('hidden');
        }
    }
}

window.switchAdminSubTab = function(tab) {
    document.getElementById('panel-requests').classList.add('hidden');
    document.getElementById('panel-directory').classList.add('hidden');
    
    document.getElementById('sub-tab-requests').className = "px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-blue-100 hover:bg-white/10";
    document.getElementById('sub-tab-directory').className = "px-5 py-2.5 rounded-xl text-sm font-bold transition-all text-blue-100 hover:bg-white/10";

    if (tab === 'requests') {
        document.getElementById('panel-requests').classList.remove('hidden');
        document.getElementById('sub-tab-requests').className = "px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-blue-800 shadow-lg";
    } else {
        document.getElementById('panel-directory').classList.remove('hidden');
        document.getElementById('sub-tab-directory').className = "px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-blue-800 shadow-lg";
    }
}

let searchTimeout = null;
window.onEmailChange = async function(val) {
    clearTimeout(searchTimeout);
    const dynamicFields = document.getElementById('dynamicFieldsContainer');
    const submitBtn = document.getElementById('submitBtn');
    document.getElementById('resultBox').classList.add('hidden');

    const email = val.trim().toLowerCase();
    if (!email || !email.includes('@')) {
        dynamicFields.classList.add('hidden');
        submitBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Verificar Cadastro`;
        currentSelectedUser = null;
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const docRef = doc(db, "usuarios", email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                currentSelectedUser = docSnap.data();
                setupDynamicFields();
            } else {
                dynamicFields.classList.add('hidden');
                currentSelectedUser = null;
            }
        } catch (error) {
            console.error("Erro ao consultar e-mail no Firestore:", error);
        }
    }, 500);
}

function setupDynamicFields() {
    const dynamicFields = document.getElementById('dynamicFieldsContainer');
    const fieldGroupNome = document.getElementById('fieldGroupNome');
    const fieldGroupDepto = document.getElementById('fieldGroupDepto');
    const statusBadge = document.getElementById('statusBadge');
    const submitBtn = document.getElementById('submitBtn');

    dynamicFields.classList.remove('hidden');

    if (!currentSelectedUser.depto || currentSelectedUser.depto.trim() === '' || currentSelectedUser.depto === 'Não Informado') {
        fieldGroupDepto.classList.remove('hidden');
        document.getElementById('deptoInput').required = true;
    } else {
        fieldGroupDepto.classList.add('hidden');
        document.getElementById('deptoInput').required = false;
    }

    if (currentSelectedUser.hasCpf) {
        statusBadge.className = "flex w-fit items-center gap-2 text-xs font-bold py-1.5 px-3 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200";
        statusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Cadastro Encontrado`;
        fieldGroupNome.classList.add('hidden');
        document.getElementById('nomeInput').required = false;

        submitBtn.className = "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-base cursor-pointer";
        submitBtn.innerHTML = `<i class="fa-solid fa-lock-open"></i> Validar e Revelar Senha`;
    } else {
        statusBadge.className = "flex w-fit items-center gap-2 text-xs font-bold py-1.5 px-3 rounded-lg bg-amber-100 text-amber-700 border border-amber-200";
        statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Cadastro Incompleto`;
        fieldGroupNome.classList.remove('hidden');
        document.getElementById('nomeInput').required = true;

        submitBtn.className = "w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 text-base cursor-pointer";
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Solicitar Acesso à Senha`;
    }
}

window.handleFormSubmission = async function(event) {
    event.preventDefault();
    if (!currentSelectedUser) return;

    const email = currentSelectedUser.email;
    const cpf = document.getElementById('cpfInput').value.replace(/\D/g, '');
    const nascimento = document.getElementById('nascimentoInput').value;
    const telefone = document.getElementById('telefoneInput').value.replace(/\D/g, '');
    const nome = document.getElementById('nomeInput').value.trim();
    const depto = document.getElementById('deptoInput').value.trim();

    Swal.fire({
        title: 'Processando...',
        text: 'Aguarde enquanto verificamos suas informações.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        if (currentSelectedUser.hasCpf) {
            // VALIDAÇÃO: Tenta ler a senha combinando E-mail e CPF no ID do documento
            const senhaDocRef = doc(db, 'senhas', `${email}_${cpf}`);
            const senhaSnap = await getDoc(senhaDocRef);

            if (senhaSnap.exists()) {
                const senhaData = senhaSnap.data();
                
                // Tenta atualizar os dados do usuário. O Firebase permite graças à nossa regra de segurança 
                // se o CPF que estamos enviando bater com o que está no banco.
                try {
                    await updateDoc(doc(db, 'usuarios_private', email), { cpf, nascimento, telefone });
                    if (nome || depto) {
                        const updatePublic = {};
                        if (nome) updatePublic.nome = nome;
                        if (depto) updatePublic.depto = depto;
                        // Nota: Um usuário anônimo não conseguirá atualizar dados públicos com as regras atuais. 
                        // Para permitir, as regras precisam ser ajustadas, ou aceitamos que ele só grava o private.
                        // Ignoraremos falhas na atualização pública no frontend se não for admin.
                    }
                } catch(e) { console.log('Aviso: Atualização de perfil negada por regras de segurança', e); }

                Swal.close();
                showResultBox(true, 'Acesso Autorizado!', `
                    <p class="mb-3">Seus dados foram validados com sucesso.</p>
                    <div class="bg-white p-4 rounded-xl border border-emerald-100 flex items-center justify-between shadow-sm">
                        <div>
                            <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Sua Senha de Acesso</p>
                            <p class="text-lg font-mono font-bold text-slate-800">${senhaData.senha}</p>
                        </div>
                        <button type="button" onclick="navigator.clipboard.writeText('${senhaData.senha}'); Swal.fire('Copiado!', 'A senha foi copiada para a área de transferência.', 'success')" class="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </div>
                `, 'emerald', 'fa-unlock');

            } else {
                Swal.close();
                showResultBox(false, 'Acesso Negado', 'CPF incorreto ou registro não encontrado.', 'rose', 'fa-circle-xmark');
            }
        } else {
            // SOLICITAÇÃO
            await addDoc(collection(db, "solicitacoes"), {
                email, cpf, nome, nascimento, telefone, depto, status: 'pendente', data_solicitacao: new Date()
            });

            Swal.close();
            const waLink = `https://wa.me/5599991435297?text=${encodeURIComponent("Dados preenchidos aguardando a senha.")}`;
            showResultBox(true, 'Solicitação Enviada!', `
                <p class="mb-4">Seus dados foram enviados para o administrador e estão em análise.</p>
                <a href="${waLink}" target="_blank" class="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-[#25D366]/30 transition-all">
                    <i class="fa-brands fa-whatsapp text-xl"></i> Solicitar via WhatsApp
                </a>
            `, 'blue', 'fa-paper-plane');
            document.getElementById('recoverForm').reset();
            document.getElementById('dynamicFieldsContainer').classList.add('hidden');
            currentSelectedUser = null;
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro de comunicação com o Firebase.', 'error');
    }
}

function showResultBox(isSuccess, title, content, color, icon) {
    const resultBox = document.getElementById('resultBox');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultContent = document.getElementById('resultContent');

    resultBox.classList.remove('hidden');
    resultBox.className = `mx-6 md:mx-8 mb-6 md:mb-8 p-6 rounded-xl border border-${color}-200 bg-${color}-50 text-${color}-950 animate-fade-in`;
    resultIcon.className = `p-3 rounded-xl bg-${color}-500 text-white shadow-lg shadow-${color}-500/30`;
    resultIcon.innerHTML = `<i class="fa-solid ${icon} text-2xl"></i>`;
    resultTitle.innerText = title;
    resultContent.innerHTML = content;
}

// =================== ADMIN LOGIC ===================

onAuthStateChanged(auth, (user) => {
    if (user && currentTab === 'admin') {
        switchTab('admin');
    }
});

window.handleAdminLogin = async function(event) {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const senha = document.getElementById('adminPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        switchTab('admin');
    } catch (error) {
        document.getElementById('loginError').classList.remove('hidden');
        console.error("Erro no login:", error);
    }
}

window.logoutAdmin = async function() {
    await signOut(auth);
    switchTab('self-service');
}

async function loadAdminDashboard() {
    try {
        const usersSnap = await getDocs(collection(db, "usuarios"));
        const privateSnap = await getDocs(collection(db, "usuarios_private"));
        const reqSnap = await getDocs(query(collection(db, "solicitacoes"), where("status", "==", "pendente")));

        const privateData = {};
        privateSnap.forEach(doc => {
            privateData[doc.id] = doc.data();
        });

        const users = [];
        let completedCount = 0;
        usersSnap.forEach(doc => {
            const u = doc.data();
            const p = privateData[doc.id] || {};
            u.cpf = p.cpf || '';
            u.telefone = p.telefone || '';
            u.nascimento = p.nascimento || '';
            u.senha_backup = p.senha || '';
            
            u.isFullyComplete = !!(u.cpf && u.nome && u.depto && u.telefone && u.nascimento);
            
            users.push(u);
            if (u.isFullyComplete) completedCount++;
        });

        const requests = [];
        reqSnap.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        document.getElementById('stat-total').innerText = users.length;
        document.getElementById('stat-pending').innerText = requests.length;
        document.getElementById('stat-completed').innerText = completedCount;
        document.getElementById('requests-badge').innerText = requests.length;

        renderRequests(requests);
        renderUsers(users);
    } catch (error) {
        console.error(error);
        if (error.code === 'permission-denied') logoutAdmin();
    }
}

function renderRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = '';
    if (requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 font-medium">Nenhuma solicitação pendente</td></tr>`;
        return;
    }
    requests.forEach(req => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="py-4 px-6 font-mono text-xs text-slate-500">#...${req.id.slice(-4)}</td>
            <td class="py-4 px-6 font-semibold">${req.email}</td>
            <td class="py-4 px-6 text-slate-600">
                <div class="font-bold text-slate-800">${req.nome}</div>
                <div class="text-xs mt-0.5">${req.cpf}</div>
            </td>
            <td class="py-4 px-6 text-slate-600">
                <div>${req.nascimento}</div>
                <div class="text-xs mt-0.5">${req.telefone}</div>
            </td>
            <td class="py-4 px-6 text-center">
                <button onclick="approveRequest('${req.id}', '${req.email}', '${req.cpf}', '${req.nome}', '${req.nascimento}', '${req.telefone}', '${req.depto}')" class="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-lg text-xs transition-colors">
                    Aprovar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.currentSortCol = '';
window.currentSortDir = 'asc';

window.sortTable = function(col) {
    if (window.currentSortCol === col) {
        window.currentSortDir = window.currentSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        window.currentSortCol = col;
        window.currentSortDir = 'asc';
    }
    
    // Atualizar ícones
    const cols = ['nome', 'email', 'depto', 'cpf', 'status'];
    cols.forEach(c => {
        const icon = document.getElementById(`sort-icon-${c}`);
        if (icon) {
            if (c === window.currentSortCol) {
                icon.className = `fa-solid ${window.currentSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} ml-1 text-blue-600`;
            } else {
                icon.className = `fa-solid fa-sort ml-1 text-slate-400`;
            }
        }
    });

    filterAdminTable();
}

function renderUsers(users) {
    window.allUsers = users;
    
    const deptos = new Set();
    users.forEach(u => {
        if (u.depto) deptos.add(u.depto);
    });
    const deptoSelect = document.getElementById('filterDepto');
    if (deptoSelect) {
        const currentVal = deptoSelect.value;
        deptoSelect.innerHTML = '<option value="">Todos os Departamentos</option>';
        Array.from(deptos).sort().forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            deptoSelect.appendChild(opt);
        });
        if (deptos.has(currentVal)) {
            deptoSelect.value = currentVal;
        }
    }

    window.filterAdminTable();
}

window.filterAdminTable = function() {
    const queryStr = document.getElementById('adminSearch').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus') ? document.getElementById('filterStatus').value : '';
    const deptoFilter = document.getElementById('filterDepto') ? document.getElementById('filterDepto').value : '';
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    
    if (!window.allUsers) return;

    let filtered = window.allUsers.filter(u => 
        u.email.toLowerCase().includes(queryStr) || 
        (u.nome && u.nome.toLowerCase().includes(queryStr))
    );

    if (statusFilter === 'completo') {
        filtered = filtered.filter(u => u.isFullyComplete);
    } else if (statusFilter === 'incompleto') {
        filtered = filtered.filter(u => !u.isFullyComplete);
    }

    if (deptoFilter) {
        filtered = filtered.filter(u => u.depto === deptoFilter);
    }

    if (window.currentSortCol) {
        filtered.sort((a, b) => {
            let valA, valB;
            if (window.currentSortCol === 'status') {
                valA = a.isFullyComplete ? 1 : 0;
                valB = b.isFullyComplete ? 1 : 0;
            } else {
                valA = (a[window.currentSortCol] || '').toLowerCase();
                valB = (b[window.currentSortCol] || '').toLowerCase();
            }

            if (valA < valB) return window.currentSortDir === 'asc' ? -1 : 1;
            if (valA > valB) return window.currentSortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    filtered.forEach(u => {
        const statusBadge = u.isFullyComplete 
            ? `<span class="bg-emerald-100 text-emerald-700 py-1 px-3 rounded-lg text-xs font-bold w-full block text-center"><i class="fa-solid fa-check mr-1"></i> Completo</span>`
            : `<span class="bg-amber-100 text-amber-700 py-1 px-3 rounded-lg text-xs font-bold w-full block text-center"><i class="fa-solid fa-exclamation mr-1"></i> Incompleto</span>`;

        let telHtml = '';
        if (u.telefone) {
            const digits = u.telefone.replace(/\D/g, '');
            if (digits.length >= 10) {
                telHtml = `<a href="https://wa.me/55${digits}" target="_blank" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline mt-1 block"><i class="fa-brands fa-whatsapp mr-1"></i>${u.telefone}</a>`;
            } else {
                telHtml = `<div class="text-xs text-slate-500 mt-1"><i class="fa-solid fa-phone mr-1"></i>${u.telefone}</div>`;
            }
        }

        let nascFormatado = u.nascimento || '';
        if (nascFormatado.includes('-')) {
            const p = nascFormatado.split('-');
            if (p.length === 3) nascFormatado = `${p[2]}/${p[1]}/${p[0]}`;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="py-4 px-6">
                <div class="font-bold text-slate-800">${u.nome || '-'}</div>
                <div class="text-xs text-slate-400 mt-0.5">${u.usuario}</div>
            </td>
            <td class="py-4 px-6 font-medium text-blue-600">${u.email}</td>
            <td class="py-4 px-6 text-slate-600">${u.depto}</td>
            <td class="py-4 px-6">
                <div class="font-mono text-sm text-slate-800">${u.cpf || '-'}</div>
                ${telHtml}
                ${nascFormatado ? `<div class="text-xs text-slate-500 mt-0.5"><i class="fa-solid fa-cake-candles mr-1"></i>${nascFormatado}</div>` : ''}
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-col items-center justify-center gap-2">
                    ${statusBadge}
                    <button onclick="openEditModal('${u.email}')" class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors px-3 py-1 rounded bg-blue-50 w-full"><i class="fa-solid fa-pen mr-1"></i> Editar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.approveRequest = async function(id, email, cpf, nome, nascimento, telefone, depto) {
    try {
        // Atualiza usuarios (public)
        await updateDoc(doc(db, 'usuarios', email), { hasCpf: true, nome, depto });
        
        // Atualiza usuarios_private
        await setDoc(doc(db, 'usuarios_private', email), { cpf, nascimento, telefone }, { merge: true });

        // Retrieve the backup password from usuarios_private
        const privDoc = await getDoc(doc(db, 'usuarios_private', email));
        if (privDoc.exists() && privDoc.data().senha) {
            await setDoc(doc(db, 'senhas', `${email}_${cpf}`), { senha: privDoc.data().senha });
        }

        // Atualiza status do request
        await updateDoc(doc(db, 'solicitacoes', id), { status: 'aprovado' });

        Swal.fire({
            icon: 'success',
            title: 'Aprovado!',
            text: 'O usuário agora tem acesso ao portal.',
            timer: 2000,
            showConfirmButton: false
        });
        loadAdminDashboard();
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro ao aprovar.', 'error');
    }
}

window.openEditModal = async function(email) {
    if (!window.allUsers) return;
    const u = window.allUsers.find(x => x.email === email);
    if (!u) return;

    document.getElementById('editEmail').value = u.email;
    document.getElementById('editOldCpf').value = u.cpf || '';
    document.getElementById('editNome').value = u.nome || '';
    document.getElementById('editDepto').value = u.depto || '';
    document.getElementById('editCpf').value = u.cpf || '';
    document.getElementById('editTelefone').value = u.telefone || '';
    
    // Converter DD/MM/AAAA para YYYY-MM-DD para o input type="date"
    let nasc = u.nascimento || '';
    if (nasc.includes('/')) {
        const p = nasc.split('/');
        if (p.length === 3) nasc = `${p[2]}-${p[1]}-${p[0]}`;
    }
    document.getElementById('editNascimento').value = nasc;
    
    document.getElementById('editSenha').value = '';
    document.getElementById('editSenha').placeholder = 'Carregando...';

    document.getElementById('editUserModal').classList.remove('hidden');
    
    if (u.cpf) {
        try {
            const senhaSnap = await getDoc(doc(db, 'senhas', `${email}_${u.cpf}`));
            if (senhaSnap.exists()) {
                document.getElementById('editSenha').value = senhaSnap.data().senha;
            } else {
                document.getElementById('editSenha').value = u.senha_backup || '';
                document.getElementById('editSenha').placeholder = 'Digite para alterar ou definir';
            }
        } catch(e) {
            document.getElementById('editSenha').value = u.senha_backup || '';
            document.getElementById('editSenha').placeholder = 'Digite para alterar ou definir';
        }
    } else {
        document.getElementById('editSenha').value = u.senha_backup || '';
        document.getElementById('editSenha').placeholder = 'Digite para alterar ou definir';
    }
}

window.saveEditUser = async function(event) {
    event.preventDefault();
    const email = document.getElementById('editEmail').value;
    const oldCpf = document.getElementById('editOldCpf').value.replace(/\D/g, '');
    const nome = document.getElementById('editNome').value;
    const depto = document.getElementById('editDepto').value;
    const cpf = document.getElementById('editCpf').value.replace(/\D/g, '');
    const telefone = document.getElementById('editTelefone').value.replace(/\D/g, '');
    const senha = document.getElementById('editSenha').value;
    
    // Ler data que vem como YYYY-MM-DD do input="date"
    let nascimento = document.getElementById('editNascimento').value;
    if (nascimento && nascimento.includes('-')) {
        const p = nascimento.split('-');
        if (p.length === 3) nascimento = `${p[2]}/${p[1]}/${p[0]}`;
    } else if (!nascimento) {
        nascimento = '';
    }

    try {
        Swal.fire({title: 'Salvando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        
        await updateDoc(doc(db, 'usuarios', email), { nome, depto });
        
        const privData = { cpf, telefone, nascimento };
        if (senha) privData.senha = senha;
        await updateDoc(doc(db, 'usuarios_private', email), privData);
        
        // Se CPF ou Senha mudou, atualizar a coleção de senhas
        if (cpf && senha) {
            if (oldCpf && oldCpf !== cpf) {
                try { await deleteDoc(doc(db, 'senhas', `${email}_${oldCpf}`)); } catch(e){}
            }
            await setDoc(doc(db, 'senhas', `${email}_${cpf}`), { senha });
        }

        document.getElementById('editUserModal').classList.add('hidden');
        Swal.close();
        
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'Dados salvos com sucesso!'
        });
        
        loadAdminDashboard();
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro ao salvar.', 'error');
    }
}

window.openAddUserModal = function() {
    document.getElementById('addUserForm').reset();
    document.getElementById('addUserModal').classList.remove('hidden');
}

window.saveNewUser = async function(event) {
    event.preventDefault();
    const email = document.getElementById('addEmail').value.trim().toLowerCase();
    const usuario = document.getElementById('addUsuario').value.trim();
    const nome = document.getElementById('addNome').value.trim();
    const depto = document.getElementById('addDepto').value.trim();
    const cpf = document.getElementById('addCpf').value.replace(/\D/g, '');
    const telefone = document.getElementById('addTelefone').value.replace(/\D/g, '');
    const senha = document.getElementById('addSenha').value.trim();

    let nascimento = document.getElementById('addNascimento').value;
    if (nascimento && nascimento.includes('-')) {
        const p = nascimento.split('-');
        if (p.length === 3) nascimento = `${p[2]}/${p[1]}/${p[0]}`;
    } else if (!nascimento) {
        nascimento = '';
    }

    try {
        Swal.fire({title: 'Salvando...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        
        await setDoc(doc(db, 'usuarios', email), { 
            email, usuario, nome, depto, hasCpf: !!cpf 
        });
        
        const privData = { cpf, telefone, nascimento };
        if (senha) privData.senha = senha;
        await setDoc(doc(db, 'usuarios_private', email), privData);
        
        if (cpf && senha) {
            await setDoc(doc(db, 'senhas', `${email}_${cpf}`), { senha });
        }

        document.getElementById('addUserModal').classList.add('hidden');
        Swal.close();
        
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'Usuário adicionado com sucesso!'
        });
        
        loadAdminDashboard();
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro ao adicionar usuário.', 'error');
    }
}

window.exportToCSV = async function() {
    try {
        Swal.fire({title: 'Gerando Planilha...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        
        // Obter todas as senhas para associar aos usuários
        const senhasSnap = await getDocs(collection(db, "senhas"));
        const senhasData = {};
        senhasSnap.forEach(doc => {
            senhasData[doc.id] = doc.data().senha;
        });

        let csvContent = "Nome;Usuário;E-mail Corporativo;Departamento;CPF;Telefone;Nascimento;Status;Senha\n";

        if (window.allUsers) {
            window.allUsers.forEach(u => {
                const nome = (u.nome || '').replace(/;/g, ',');
                const usuario = (u.usuario || '').replace(/;/g, ',');
                const email = (u.email || '').replace(/;/g, ',');
                const depto = (u.depto || '').replace(/;/g, ',');
                const cpf = (u.cpf || '').replace(/;/g, ',');
                const telefone = (u.telefone || '').replace(/;/g, ',');
                
                let nasc = u.nascimento || '';
                if (nasc.includes('-')) {
                    const p = nasc.split('-');
                    if (p.length === 3) nasc = `${p[2]}/${p[1]}/${p[0]}`;
                }
                
                const status = u.isFullyComplete ? "Completo" : "Incompleto";
                
                let senha = "";
                if (u.cpf) {
                    const senhaKey = `${u.email}_${u.cpf.replace(/\D/g, '')}`;
                    senha = senhasData[senhaKey] || u.senha_backup || "";
                } else {
                    senha = u.senha_backup || "";
                }

                csvContent += `"${nome}";"${usuario}";"${email}";"${depto}";"${cpf}";"${telefone}";"${nasc}";"${status}";"${senha}"\n`;
            });
        }

        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "diretorio_colaboradores.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Swal.close();
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Ocorreu um erro ao gerar a planilha.', 'error');
    }
}

window.deleteUser = async function(email, cpf) {
    const result = await Swal.fire({
        title: 'Tem certeza?',
        text: "Esta ação não poderá ser desfeita!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            Swal.fire({title: 'Excluindo...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
            
            await deleteDoc(doc(db, 'usuarios', email));
            await deleteDoc(doc(db, 'usuarios_private', email));
            
            if (cpf) {
                try {
                    await deleteDoc(doc(db, 'senhas', `${email}_${cpf}`));
                } catch(e) {}
            }

            Swal.close();
            Swal.fire('Excluído!', 'O usuário foi removido com sucesso.', 'success');
            
            loadAdminDashboard();
        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Ocorreu um erro ao excluir o usuário.', 'error');
        }
    }
}

window.deleteUserFromEdit = function() {
    const email = document.getElementById('editEmail').value;
    const cpf = document.getElementById('editCpf').value.replace(/\D/g, '');
    document.getElementById('editUserModal').classList.add('hidden');
    deleteUser(email, cpf);
}

window.handleCSVUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        await processCSV(text);
        event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
}

async function processCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
        Swal.fire('Erro', 'O arquivo CSV parece vazio ou não possui senhas.', 'error');
        return;
    }

    let separator = ';';
    if (!lines[0].includes(';') && lines[0].includes(',')) separator = ',';

    const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    let emailIdx = headers.findIndex(h => h.includes('e-mail') || h.includes('email'));
    let senhaIdx = headers.findIndex(h => h.includes('senha') || h.includes('password'));

    if (emailIdx === -1) emailIdx = 1; // Assume exported CSV defaults
    if (senhaIdx === -1) senhaIdx = 7; 

    Swal.fire({title: 'Importando...', text: 'Aguarde enquanto as senhas são atualizadas...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});

    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cols = [];
        let inQuotes = false;
        let current = "";
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') {
                inQuotes = !inQuotes;
            } else if (line[j] === separator && !inQuotes) {
                cols.push(current);
                current = "";
            } else {
                current += line[j];
            }
        }
        cols.push(current);
        
        if (cols.length <= Math.max(emailIdx, senhaIdx)) continue;

        const email = cols[emailIdx].trim().toLowerCase();
        const senha = cols[senhaIdx].trim();

        if (!email || !senha) continue;

        const user = window.allUsers?.find(u => u.email === email);
        if (user) {
            const cpfOnly = (user.cpf || '').replace(/\D/g, '');
            try {
                await setDoc(doc(db, 'usuarios_private', email), { senha }, { merge: true });
                if (cpfOnly) {
                    await setDoc(doc(db, 'senhas', `${email}_${cpfOnly}`), { senha });
                }
                updatedCount++;
            } catch(e) {
                console.error("Erro ao importar para:", email, e);
                errorCount++;
            }
        } else {
            errorCount++;
        }
    }

    Swal.fire({
        icon: 'success',
        title: 'Importação Concluída',
        html: `Senhas atualizadas: <b>${updatedCount}</b><br>Não vinculadas (sem CPF ou e-mail incorreto): <b>${errorCount}</b>`
    });
}
