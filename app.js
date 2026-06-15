import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
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
            showResultBox(true, 'Solicitação Enviada!', 'Seus dados foram enviados para o administrador.', 'blue', 'fa-paper-plane');
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
        const reqSnap = await getDocs(query(collection(db, "solicitacoes"), where("status", "==", "pendente")));

        const users = [];
        let completedCount = 0;
        usersSnap.forEach(doc => {
            const u = doc.data();
            users.push(u);
            if (u.hasCpf) completedCount++;
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

function renderUsers(users) {
    window.allUsers = users;
    window.filterAdminTable();
}

window.filterAdminTable = function() {
    const queryStr = document.getElementById('adminSearch').value.toLowerCase();
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    
    if (!window.allUsers) return;

    const filtered = window.allUsers.filter(u => 
        u.email.toLowerCase().includes(queryStr) || 
        (u.nome && u.nome.toLowerCase().includes(queryStr))
    );

    filtered.forEach(u => {
        const statusBadge = u.hasCpf 
            ? `<span class="bg-emerald-100 text-emerald-700 py-1 px-3 rounded-lg text-xs font-bold"><i class="fa-solid fa-check mr-1"></i> Completo</span>`
            : `<span class="bg-amber-100 text-amber-700 py-1 px-3 rounded-lg text-xs font-bold"><i class="fa-solid fa-exclamation mr-1"></i> Incompleto</span>`;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="py-4 px-6">
                <div class="font-bold text-slate-800">${u.nome || '-'}</div>
                <div class="text-xs text-slate-400 mt-0.5">${u.usuario}</div>
            </td>
            <td class="py-4 px-6 font-medium text-blue-600">${u.email}</td>
            <td class="py-4 px-6 text-slate-600">${u.depto}</td>
            <td class="py-4 px-6 font-mono text-sm text-slate-500">${u.hasCpf ? '***' : '-'}</td>
            <td class="py-4 px-6 text-center">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.approveRequest = async function(id, email, cpf, nome, nascimento, telefone, depto) {
    try {
        // Atualiza usuarios (public)
        await updateDoc(doc(db, 'usuarios', email), { hasCpf: true, nome, depto });
        
        // Atualiza usuarios_private
        await setDoc(doc(db, 'usuarios_private', email), { cpf, nascimento, telefone });

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
