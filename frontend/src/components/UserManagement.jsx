import { useState, useEffect } from 'react';

// Componente para o formulário de criação/edição de utilizador
function UserForm({ user, onSave, onCancel }) {
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user?.role || 'padrao');
    
    const isEditing = !!user;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username || (!password && !isEditing)) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        onSave({ _id: user?._id, username, password, role });
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 p-4 bg-gray-50 rounded-md border">
            <h3 className="font-bold mb-2">{isEditing ? `Editando ${user.username}` : 'Criar Novo Usuário'}</h3>
            <div className="space-y-2">
                <input type="text" placeholder="Nome de usuário" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border rounded" required />
                <input type="password" placeholder={isEditing ? "Nova senha (opcional)" : "Senha"} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" required={!isEditing} />
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded">
                    <option value="padrao">Padrão</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div className="mt-3">
                <button type="submit" className="bg-blue-600 text-white py-1 px-3 rounded-md">{isEditing ? 'Atualizar' : 'Criar'}</button>
                <button type="button" onClick={onCancel} className="ml-2 text-gray-600">Cancelar</button>
            </div>
        </form>
    );
}


export default function UserManagement({ api, onBack }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null); // Guarda o utilizador a ser editado
    const [isCreating, setIsCreating] = useState(false); // Controla a visibilidade do formulário de criação
    const [successMessage, setSuccessMessage] = useState('');

    const fetchUsers = async () => {
        try {
            if (!api) return;
            const { data } = await api.get('/api/v2/usuarios');
            setUsers(data);
        } catch (err) {
            setError('Não foi possível carregar os usuários.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [api]);

    const handleSaveUser = async (userData) => {
        setError(null);
        setSuccessMessage('');
        try {
            if (!api) return;
            if (userData._id) { // A editar
                const { _id, ...updateData } = userData;
                if (!updateData.password) delete updateData.password; // Não envia senha vazia
                await api.put(`/api/v2/usuarios/${_id}`, updateData);
                setSuccessMessage('Usuário atualizado com sucesso!');
            } else { // A criar
                await api.post('/api/v2/usuarios', userData);
                setSuccessMessage('Usuário criado com sucesso!');
            }
            fetchUsers(); // Recarrega a lista
            setEditingUser(null);
            setIsCreating(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Ocorreu um erro.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Tem a certeza que quer apagar este usuário?')) {
            setError(null);
            setSuccessMessage('');
            try {
                if (!api) return;
                await api.delete(`/api/v2/usuarios/${userId}`);
                setSuccessMessage('Usuário apagado com sucesso!');
                fetchUsers(); // Recarrega a lista
            } catch (err) {
                setError(err.response?.data?.message || 'Não foi possível apagar o usuário.');
            }
        }
    };

    if (isLoading) return (
        <div className="flex flex-col justify-center items-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-semibold text-gray-600">Carregando usuários...</p>
        </div>
    );

    return (
        <div className="p-6 bg-white rounded-lg shadow-md mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Gestão de Usuários</h2>
                <button onClick={onBack} className="text-blue-600 hover:underline">Voltar ao Dashboard</button>
            </div>
            
            {!isCreating && !editingUser && (
                <button onClick={() => setIsCreating(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg mb-4">
                    + Criar Novo Usuário
                </button>
            )}

            {successMessage && <p className="text-green-600 bg-green-100 p-2 rounded-md mb-4">{successMessage}</p>}
            {error && <p className="text-red-500 bg-red-100 p-2 rounded-md mb-4">{error}</p>}

            {isCreating && <UserForm onSave={handleSaveUser} onCancel={() => setIsCreating(false)} />}
            
            <div className="space-y-4">
                {users.map(user => (
                    editingUser?._id === user._id ? (
                        <UserForm key={user._id} user={editingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} />
                    ) : (
                        <div key={user._id} className="p-4 border rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{user.username}</p>
                                <p className="text-sm text-gray-500">Função: {user.role}</p>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => setEditingUser(user)} className="bg-gray-200 hover:bg-gray-300 text-black font-semibold py-1 px-3 rounded-md">Editar</button>
                                <button onClick={() => handleDeleteUser(user._id)} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md">Apagar</button>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
