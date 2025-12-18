document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 1. CONFIGURACIÓN Y REFERENCIAS DE LA BASE DE DATOS
    // =========================================================
    const database = firebase.database();
    const pedidosRef = database.ref('pedidos');

    // --- 2. REFERENCIAS DOM DEL PANEL ADMIN ---
    const tablePendientesBody = document.getElementById('table-pendientes').querySelector('tbody');
    const tablePreparandoBody = document.getElementById('table-preparando').querySelector('tbody');
    
    const statPendientes = document.getElementById('stat-pendientes');
    const statPreparando = document.getElementById('stat-preparando');
    const statEntregados = document.getElementById('stat-entregados'); // Renombrado para coincidir con HTML
    const statTotalVentas = document.getElementById('stat-ventas'); // Renombrado para coincidir con HTML
    
    
    // =========================================================
    // 3. FUNCIÓN PRINCIPAL: INICIALIZACIÓN DEL DASHBOARD
    // =========================================================
    window.renderAdminDashboard = function() {
    console.log("✅ Dashboard Admin inicializado.");

    // Escuchamos los cambios en la base de datos de forma estable
    pedidosRef.on('value', (snapshot) => {
        const pedidosData = snapshot.val();
        let listaPedidos = [];
        
        if (pedidosData) {
            // Convertir el objeto de Firebase a una lista (incluyendo el ID)
            listaPedidos = Object.keys(pedidosData).map(key => ({
                id: key,
                ...pedidosData[key]
            }));
        }
        
        // 1. Filtrar por Estado (Asegúrate que coincidan con los de tu base de datos)
        const pendientes = listaPedidos.filter(p => p.estado === 'Reservado');
        const preparando = listaPedidos.filter(p => p.estado === 'Preparando');
        const entregados = listaPedidos.filter(p => p.estado === 'Completado');

        // 2. Renderizar Tablas
        renderPedidosTable(tablePendientesBody, pendientes);
        renderPedidosTable(tablePreparandoBody, preparando);
        
        // 3. Actualizar Estadísticas
        updateStats(pendientes, preparando, entregados);
    }, (error) => {
        console.error("Error en la escucha de pedidos:", error);
    });
};
    // =========================================================
    // 4. FUNCIONES DE RENDERIZADO Y ACCIÓN
    // =========================================================

    function renderPedidosTable(tableBody, pedidos) {
    tableBody.innerHTML = '';
    pedidos.forEach(pedido => {
        const tr = document.createElement('tr');
        
        let actionBtn = '';
        if (pedido.estado === 'Reservado') {
            // Este botón llama a la función del Paso 2
            actionBtn = `<button class="btn-action btn-preparar" onclick="cambiarEstadoPedido('${pedido.id}', 'Preparando')"><i class="fas fa-fire"></i> Preparar</button>`;
        } else if (pedido.estado === 'Preparando') {
            actionBtn = `<button class="btn-action btn-completar" onclick="cambiarEstadoPedido('${pedido.id}', 'Completado')"><i class="fas fa-check"></i> Entregar</button>`;
        }

        tr.innerHTML = `
            <td data-label="ID Pedido">#${pedido.id.substring(1, 6)}</td>
            <td data-label="Cliente">${pedido.nombre || pedido.cliente || 'Sin nombre'}</td>
            <td data-label="Contacto">${pedido.telefono}</td>
            <td data-label="Platos">${pedido.platos.map(p => `${p.cantidad}x ${p.nombre}`).join('<br>')}</td>
            <td data-label="Total">$${pedido.total.toLocaleString('es-CO')}</td>
            <td data-label="Acción">${actionBtn}</td>
        `;
        tableBody.appendChild(tr);
    });
}
    
    function updateStats(pendientes, preparando, entregados) {
        statPendientes.textContent = pendientes.length;
        statPreparando.textContent = preparando.length;
        statEntregados.textContent = entregados.length;
        
        const totalVentas = entregados.reduce((sum, p) => sum + (p.total || 0), 0);
        statTotalVentas.textContent = `$${totalVentas.toLocaleString('es-CO')}`;
    }

    // FUNCIÓN PÚBLICA: Actualizar Estado del Pedido
    window.updatePedidoStatus = function(pedidoId, newStatus) {
        if (!firebase.auth().currentUser) {
            alert('❌ ACCESO DENEGADO. Solo el Administrador puede cambiar el estado.');
            return;
        }
        
        if (!confirm(`¿Confirmar cambio de estado para Pedido ID ${pedidoId.substring(0, 6)} a "${newStatus}"?`)) return;

        pedidosRef.child(pedidoId).update({ estado: newStatus })
            .then(() => {
                console.log(`Pedido ${pedidoId} actualizado a ${newStatus}`);
                // alert(`✅ Pedido ID ${pedidoId.substring(0, 6)} movido a "${newStatus}" con éxito.`); // Desactivado para UX más rápida
            })
            .catch(error => {
                console.error("Error al actualizar estado:", error);
                alert('❌ Error al actualizar el estado. Revisa las reglas de Firebase.');
            });
    }

    // FUNCIÓN PÚBLICA: Eliminar Pedido
    window.deletePedido = function(pedidoId) {
        if (!firebase.auth().currentUser) {
            alert('❌ ACCESO DENEGADO. Solo el Administrador puede eliminar pedidos.');
            return;
        }

        if (!confirm(`🚨 ¿Está seguro de ELIMINAR el Pedido ID ${pedidoId.substring(0, 6)}? Esta acción es irreversible.`)) return;

        pedidosRef.child(pedidoId).remove()
            .then(() => {
                alert(`✅ Pedido ID ${pedidoId.substring(0, 6)} eliminado con éxito.`);
            })
            .catch(error => {
                console.error("Error al eliminar pedido:", error);
                alert('❌ Error al eliminar el pedido. Revisa las reglas de Firebase.');
            });
    }
    
    // =========================================================
    // 5. GESTIÓN DE UTILIDADES (Exportar / Reset)
    // =========================================================

    // Exportar Datos
    document.getElementById('btn-export-data').addEventListener('click', () => {
        if (!firebase.auth().currentUser) {
            alert('❌ ACCESO DENEGADO. Solo el Administrador puede exportar datos.');
            return;
        }
        // Lógica de exportación (se mantiene, pero se envían todos los datos)
        pedidosRef.once('value').then(snapshot => {
            const data = snapshot.val();
            if (!data) {
                alert('No hay datos para exportar.');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,";
            
            const headers = ["ID", "Fecha", "Cliente", "Teléfono", "Total", "Estado", "Detalles_Platos"];
            csvContent += headers.join(",") + "\n";
            
            Object.keys(data).forEach(key => {
                const pedido = data[key];
                
                const fecha = new Date(pedido.fechaPedido || Date.now()).toLocaleDateString("es-CO");
                const total = pedido.total || 0;
                const detalles = (pedido.platos || []).map(p => `${p.cantidad}x ${p.nombre}`).join('; ');

                const row = [
                    key,
                    fecha,
                    `"${pedido.cliente || ''}"`, 
                    pedido.telefono || '',
                    total,
                    pedido.estado,
                    `"${detalles}"`
                ].join(",");
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `pedidos_lacocina_${new Date().toISOString().substring(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert("✅ Datos de pedidos exportados con éxito.");
        })
        .catch(e => {
            console.error("Error al exportar datos:", e);
            alert("❌ ERROR DE PERMISOS. Asegúrate de haber iniciado sesión como Administrador.");
        });
    });    

    // Reset Total
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if (!firebase.auth().currentUser) {
            alert('❌ ACCESO DENEGADO. Solo el Administrador puede resetear los datos.');
            return;
        }

        if (!confirm('🚨 ADVERTENCIA CRÍTICA: ESTO BORRARÁ TODO EL HISTORIAL DE PEDIDOS. ¿CONFIRMAR ELIMINACIÓN TOTAL?')) return;
        
        pedidosRef.set(null) 
            .then(() => {
                alert('✅ Historial de pedidos completamente borrado. El panel se actualizará.');
            })
            .catch(e => {
                console.error("Error al resetear la base de datos:", e);
                alert("❌ ERROR DE PERMISOS. Operación rechazada. Verifica las Reglas de Firebase.");
            });
    });
});
// Agregar funcionalidad al botón de salir (asegúrate de crear el botón en el HTML)
document.getElementById('btn-logout').addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
        alert("Sesión cerrada correctamente");
        location.reload(); // Recarga para que el CSS oculte todo
    });
});
// FUNCIÓN DE SEGURIDAD PARA CAMBIAR ESTADO
window.cambiarEstadoPedido = function(id, nuevoEstado) {
    const user = firebase.auth().currentUser;

    if (!user) {
        alert("🚨 ERROR CRÍTICO: No has iniciado sesión. El sistema bloqueó el acceso.");
        return;
    }

    if (confirm(`¿Seguro que quieres marcar el pedido como ${nuevoEstado}?`)) {
        // Accedemos a la carpeta pedidos -> ID del pedido
        firebase.database().ref('pedidos/' + id).update({
            estado: nuevoEstado
        })
        .then(() => {
            console.log("✅ Firebase: Estado actualizado con éxito.");
        })
        .catch((error) => {
            console.error("Error de Firebase:", error);
            alert("❌ Error de Permisos: Revisa que tus REGLAS de Firebase permitan 'update' para usuarios autenticados.");
        });
    }
};
// Esta función hace que suene la campana
function sonarAlertaPedido() {
    const sonido = new Audio('https://assets.mixkit.co/active_storage/sfx/2258/2258-preview.mp3');
    sonido.play().catch(error => console.log("El navegador bloqueó el sonido inicial:", error));
}

// Aquí le decimos a Firebase que cada vez que entre un pedido nuevo, suene la campana
firebase.database().ref('pedidos').limitToLast(1).on('child_added', (snapshot) => {
    // Solo suena si el panel ya cargó los pedidos viejos
    if (typeof panelCargado !== 'undefined' && panelCargado) {
        sonarAlertaPedido();
    }
});
let panelCargado = false;
setTimeout(() => { panelCargado = true; }, 3000); // Espera 3 segundos antes de activar el sonido
