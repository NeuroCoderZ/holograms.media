// frontend/js/panels/hologramPanelManager.js

import { neonApiService } from '../services/neonApiService.js';
import { state } from '../core/init.js';
import eventBus from '../core/eventBus.js'; // Импортируем eventBus

async function loadAndRenderHolograms() {
    // Проверяем, существует ли state.uiElements.containers и hologramList
    if (!state.uiElements || !state.uiElements.containers || !state.uiElements.containers.hologramList) {
        console.warn("HologramPanelManager: hologramList container not found in state.uiElements. Make sure it's initialized in uiManager.js and present in index.html.");
        // Попытка найти контейнер напрямую, если его нет в state (как запасной вариант)
        const directContainer = document.getElementById('hologram-list-container');
        if (!directContainer) {
            console.error("HologramPanelManager: CRITICAL - #hologram-list-container not found in DOM.");
            return;
        }
        // Если нашли напрямую, можно его использовать, но лучше чтобы он был в state.
        // Для примера, продолжим с ним, но это указывает на проблему инициализации UI.
        state.uiElements.containers.hologramList = directContainer;
    }

    const container = state.uiElements.containers.hologramList;
    container.innerHTML = '<li>Loading your holograms...</li>'; // Сообщение о загрузке

    try {
        const holograms = await neonApiService.fetchUserHolograms();

        if (!holograms || holograms.length === 0) {
            container.innerHTML = '<li>You have no saved holograms.</li>';
            return;
        }

        // Отрисовываем список
        // В модели UserHologramDB поля называются id, hologram_name, created_at, updated_at, user_id, hologram_state_data
        // В NeonApiService.fetchUserHolograms мы делаем select '*', так что все эти поля должны прийти.
        // ID в таблице user_holograms это auto-incrementing integer (id), а не UUID.
        // В UserHologramResponseModel было hologram_id: UUID, но UserHologramDB имеет id: int.
        // Убедимся, что используем правильное поле ID. В rls_policies.sql мы работали с таблицей user_holograms,
        // которая, согласно hologram_models.py (UserHologramDB), имеет id: int.
        const listItems = holograms.map(h => `
            <li class="hologram-item" data-hologram-id="${h.id}" data-hologram-name="${h.hologram_name || 'Untitled Hologram'}">
                <span class="hologram-name">${h.hologram_name || 'Untitled Hologram'}</span>
                <small class="hologram-timestamp">Created: ${new Date(h.created_at).toLocaleString()}</small>
                <div class="hologram-actions">
                    <button class="load-hologram-btn" data-hologram-id="${h.id}">Load</button>
                    <button class="edit-hologram-btn" data-hologram-id="${h.id}">Edit</button>
                    <button class="delete-hologram-btn" data-hologram-id="${h.id}">Delete</button>
                </div>
            </li>
        `).join('');

        container.innerHTML = `<ul class="hologram-list">${listItems}</ul>`; // Оборачиваем в ul с классом

        // Добавляем обработчики событий к новым кнопкам
        attachHologramActionListeners(container);

    } catch (error) {
        console.error("Failed to load holograms via Neon API", error);
        container.innerHTML = '<li>Error loading holograms. Please try again later.</li>';
    }
}

function attachHologramActionListeners(container) {
    container.querySelectorAll('.load-hologram-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const hologramId = event.target.dataset.hologramId;
            console.log(`[HologramPanel] Load hologram requested: ${hologramId}`);
            // TODO: Implement logic to load hologram by ID
            // eventBus.emit('hologram:load', { id: hologramId });
            alert(`Load hologram: ${hologramId} (not implemented yet)`);
        });
    });
    container.querySelectorAll('.edit-hologram-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const hologramId = event.target.dataset.hologramId;
            console.log(`[HologramPanel] Edit hologram requested: ${hologramId}`);
            // TODO: Implement logic to edit hologram by ID
            alert(`Edit hologram: ${hologramId} (not implemented yet)`);
        });
    });
    container.querySelectorAll('.delete-hologram-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const hologramId = event.target.dataset.hologramId;
            const hologramName = event.target.closest('.hologram-item')?.dataset.hologramName || 'this hologram';
            if (confirm(`Are you sure you want to delete "${hologramName}" (ID: ${hologramId})?`)) {
                console.log(`[HologramPanel] Delete hologram requested: ${hologramId}`);
                // TODO: Implement logic to delete hologram by ID using neonApiService
                // try {
                //    await neonApiService.deleteUserHologram(hologramId);
                //    loadAndRenderHolograms(); // Refresh list
                // } catch (error) {
                //    console.error("Failed to delete hologram:", error);
                //    alert("Error deleting hologram.");
                // }
                alert(`Delete hologram: ${hologramId} (not implemented yet)`);
            }
        });
    });
}


export function initializeHologramPanel() {
    console.log("HologramPanelManager: Initializing...");
    // Проверяем, есть ли пользователь при инициализации
    if (state.auth?.currentUser) {
        console.log("HologramPanelManager: User already logged in, loading holograms.");
        loadAndRenderHolograms();
    } else {
        console.log("HologramPanelManager: User not logged in, waiting for auth-state-changed or panel open event.");
    }

    // Слушаем событие изменения состояния аутентификации
    // Заменил 'auth-state-changed' на 'userLoggedIn' и 'userLoggedOut' для большей ясности,
    // предполагая, что firebaseInit.js или другой модуль будет генерировать такие события.
    // Если используется 'auth-state-changed' с e.detail.loggedIn, то нужно вернуть тот код.
    // Для примера, оставим с 'userLoggedIn'.
    eventBus.on('userLoggedIn', () => {
        console.log("HologramPanelManager: 'userLoggedIn' event received, loading holograms.");
        loadAndRenderHolograms();
    });

    eventBus.on('userLoggedOut', () => {
        const container = state.uiElements?.containers?.hologramList;
        if (container) {
            container.innerHTML = '<li>Please log in to see your holograms.</li>';
        }
        console.log("HologramPanelManager: 'userLoggedOut' event received, cleared hologram list.");
    });

    // Дополнительно, можно добавить слушатель на открытие панели, если список не должен грузиться сразу
    // eventBus.on('panelOpened:holograms', () => {
    //     if (state.auth?.currentUser) {
    //         loadAndRenderHolograms();
    //     }
    // });
}
