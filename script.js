// =========================================================
// 🚀 Reemplazo Total: script.js (Lógica de Venta, Carrito y UX Mejorada)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {

    // 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE
    const database = firebase.database();
    const auth = firebase.auth();
    // CRÍTICO: Aseguramos que la referencia es 'menu' y no 'platos', etc.
    const menuRef = database.ref('menu');       
    const pedidosRef = database.ref('pedidos'); 

    // 2. ESTRUCTURA DE DATOS GLOBAL Y REFERENCIAS DOM
    let carrito = []; 
    let menuCompleto = {}; 
    let datosReserva = null; 
    
    // Referencias DOM principales
    const menuContainer = document.getElementById('menu-container');
    const carritoItemsDiv = document.getElementById('carrito-items');
    const carritoTotalSpan = document.getElementById('carrito-total');
    const btnIniciarReserva = document.getElementById('btn-iniciar-reserva');
    const adminLink = document.getElementById('admin-link');
    
    // Referencias DOM de Modales
    const dataModal = document.getElementById('data-modal'); 
    const loginModal = document.getElementById('login-modal'); 
    const detailModal = document.getElementById('detail-modal'); // NUEVO Modal de Detalles
    const adminPanel = document.getElementById('admin-main-view'); // Panel de Admin

    // Referencias DOM de Formularios
    const formConfirmarDatos = document.getElementById('form-confirmar-datos');
    const formLoginAdmin = document.getElementById('form-login-admin');

    // =========================================================
    // 3. CONTROL DE VISTA: ADMIN vs. CLIENTE (CRÍTICO: Ocultar Admin por defecto)
    // =========================================================
    adminPanel.classList.add('hidden-view'); // Asegurar que inicie oculto

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // --- ADMIN AUTENTICADO ---
            if (adminLink) {
                adminLink.textContent = '🔒 Admin (Salir)';
                adminLink.onclick = window.signOutAdmin; 
            }
            
            // MUESTRA EL PANEL
            if (adminPanel) {
                adminPanel.classList.remove('hidden-view');
            }

            if (window.renderAdminDashboard) {
                window.renderAdminDashboard();
            }

        } else {
            // --- CLIENTE PÚBLICO ---
            if (adminLink) {
                adminLink.textContent = '🔒 Admin (Entrar)';
                adminLink.onclick = () => {
                    loginModal.style.display = 'block';
                };
            }
            
            // OCULTA EL PANEL
            if (adminPanel) {
                adminPanel.classList.add('hidden-view');
            }
        }
    });

    // FUNCIÓN: CERRAR SESIÓN (LOGOUT)
    window.signOutAdmin = function() {
        if (confirm('¿Estás seguro de que quieres cerrar la sesión de administrador?')) {
            auth.signOut().then(() => {
                alert('✅ Sesión cerrada con éxito.');
            }).catch((error) => {
                console.error("Error al cerrar sesión:", error);
                alert('🚫 Error al intentar cerrar sesión. Inténtalo de nuevo.');
            });
        }
    }

    // Lógica de Login
    formLoginAdmin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                alert('✅ Inicio de sesión exitoso. Cargando panel de administración...');
                loginModal.style.display = 'none';
            })
            .catch(error => {
                alert(`❌ Error de login: ${error.message}. Verifica credenciales.`);
            });
    });


    // =========================================================
    // 4. LÓGICA DE CARGA DEL MENÚ (CORREGIDA Y ESTABLE)
    // =========================================================

    function cargarMenu() {
        menuContainer.innerHTML = '<div class="loading-message">Cargando menú delicioso... ¡Un momento!</div>';

        menuRef.once('value', (snapshot) => {
            menuCompleto = snapshot.val() || {};
            menuContainer.innerHTML = ''; 

            if (Object.keys(menuCompleto).length === 0) {
                menuContainer.innerHTML = '<div class="empty-message"><i class="fas fa-exclamation-circle"></i> Aún no hay platos en el menú. ¡Cárgalos desde tu base de datos!</div>';
                return;
            }

            Object.keys(menuCompleto).forEach(platoId => {
                const plato = menuCompleto[platoId];
                
                // Aseguramos que solo se muestren platos disponibles
                if (plato.disponible) { 
                    const card = document.createElement('div');
                    card.className = 'plato-card';
                    card.dataset.id = platoId;
                    
                    card.innerHTML = `
                        <span class="plato-categoria">${plato.categoria || 'Sin Categoría'}</span>
                        <h3>${plato.nombre || 'Plato sin nombre'}</h3>
                        <div class="card-footer-info">
                            <span class="precio">$${(plato.precio || 0).toLocaleString('es-CO')}</span>
                            <button class="btn-ver-detalles" data-id="${platoId}">
                                <i class="fas fa-search"></i> Ver Detalles
                            </button>
                        </div>
                    `;
                    menuContainer.appendChild(card);
                    
                    // Listener para el nuevo botón "Ver Detalles"
                    card.querySelector('.btn-ver-detalles').addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        mostrarDetallePlato(platoId);
                    });
                }
            });

        }, (error) => {
            console.error("Error al leer el menú:", error);
            menuContainer.innerHTML = '<div class="error-message">❌ Error al cargar el menú. Revisa tu `databaseURL` en index.html y las Reglas de Firebase.</div>';
        });
    }

    // =========================================================
    // 5. FUNCIÓN: MOSTRAR DETALLES Y AGREGAR (UX Avanzada)
    // =========================================================
    function mostrarDetallePlato(platoId) {
        const plato = menuCompleto[platoId];
        if (!plato) return;

        const modalTitle = document.getElementById('detail-modal-title');
        const modalBody = document.getElementById('detail-modal-body');
        const modalFooter = document.getElementById('detail-modal-footer');

        modalTitle.textContent = plato.nombre;
        
        modalBody.innerHTML = `
            <p class="detail-category"><i class="fas fa-tag"></i> Categoría: <span>${plato.categoria || 'General'}</span></p>
            <p class="detail-description">${plato.descripcion || 'No hay una descripción detallada para este plato.'}</p>
            <p class="detail-price-big">$${plato.precio.toLocaleString('es-CO')}</p>
            
            <div class="detail-quantity-control">
                <label for="plato-cantidad">Cantidad:</label>
                <input type="number" id="plato-cantidad" value="1" min="1" max="99" class="input-cantidad">
            </div>
        `;

        modalFooter.innerHTML = `
            <button class="btn-agregar-carrito" data-id="${platoId}"><i class="fas fa-cart-plus"></i> Agregar ${plato.nombre}</button>
        `;
        
        modalFooter.querySelector('.btn-agregar-carrito').addEventListener('click', () => {
            const cantidadInput = document.getElementById('plato-cantidad');
            const cantidad = parseInt(cantidadInput.value);
            if (cantidad > 0) {
                agregarACarrito(platoId, cantidad);
                detailModal.style.display = 'none'; 
            } else {
                alert('La cantidad debe ser mayor a cero.');
            }
        });

        detailModal.style.display = 'block';
    }


    // =========================================================
    // 6. LÓGICA DEL CARRITO
    // =========================================================

    function agregarACarrito(platoId, cantidad = 1) {
        const plato = menuCompleto[platoId];
        if (!plato) return;

        const itemIndex = carrito.findIndex(item => item.id === platoId);

        if (itemIndex > -1) {
            carrito[itemIndex].cantidad += cantidad;
        } else {
            carrito.push({
                id: platoId,
                nombre: plato.nombre,
                precioUnitario: plato.precio, 
                cantidad: cantidad
            });
        }
        actualizarCarritoDOM();
    }
    
    window.quitarDeCarrito = function(platoId) {
        carrito = carrito.filter(item => item.id !== platoId);
        actualizarCarritoDOM();
    }

    function calcularTotal() {
        return carrito.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
    }
    
    function actualizarCarritoDOM() {
        carritoItemsDiv.innerHTML = '';
        const total = calcularTotal();
        carritoTotalSpan.textContent = `$${total.toLocaleString('es-CO')}`;
        btnIniciarReserva.disabled = carrito.length === 0;
        
        if (carrito.length === 0) {
            carritoItemsDiv.innerHTML = '<div class="empty-message"><i class="fas fa-box-open"></i> El carrito está vacío.</div>';
        } else {
            carrito.forEach(item => {
                const row = document.createElement('div');
                row.className = 'carrito-item-row';
                row.innerHTML = `
                    <span>${item.cantidad}x ${item.nombre}</span>
                    <span>$${(item.precioUnitario * item.cantidad).toLocaleString('es-CO')}</span>
                    <button class="btn-quitar" onclick="quitarDeCarrito('${item.id}')" title="Quitar item"><i class="fas fa-trash-alt"></i></button>
                `;
                carritoItemsDiv.appendChild(row);
            });
        }
    }
    
    // =========================================================
    // 7. LÓGICA DE RESERVA Y FINALIZACIÓN DE PEDIDO
    // =========================================================

    btnIniciarReserva.addEventListener('click', () => {
        dataModal.style.display = 'block';
    });

    formConfirmarDatos.addEventListener('submit', (e) => {
        e.preventDefault();
        
        datosReserva = {
            nombre: document.getElementById('modal-nombre').value,
            telefono: document.getElementById('modal-telefono').value
        };
        
        dataModal.style.display = 'none';
        
        if (confirm(`Total a pagar: $${calcularTotal().toLocaleString('es-CO')}.\n\nConfirme para enviar su pedido al restaurante.`)) {
             finalizarPedido();
        } else {
             datosReserva = null; 
        }
    });
    
    async function finalizarPedido() {
    if (carrito.length === 0 || !datosReserva) return;
    
    const totalCalculado = calcularTotal();
    
    // IMPORTANTE: Cambiamos 'cliente' por 'nombre' para que coincida con las reglas de seguridad
    const pedidoData = {
        nombre: datosReserva.nombre, // Antes decía 'cliente', por eso fallaba
        telefono: datosReserva.telefono,
        total: totalCalculado, 
        estado: 'Reservado', 
        fechaPedido: firebase.database.ServerValue.TIMESTAMP,
        platos: carrito.map(item => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad
        }))
    };
    
    try {
        const newPedidoRef = pedidosRef.push();
        await newPedidoRef.set(pedidoData);
        
        // Si el código llega aquí, es que Firebase aceptó el pedido
        showSuccessAnimation(totalCalculado);
        alert('🎉 ¡Pedido realizado con éxito!');
        
        // Enviamos la confirmación por WhatsApp
        sendWhatsappConfirmation(datosReserva.nombre, totalCalculado, carrito);

        // Limpieza total
        carrito = [];
        datosReserva = null;
        actualizarCarritoDOM();
        
        // Cerrar el modal de datos si está abierto
        if(document.getElementById('data-modal')) {
            document.getElementById('data-modal').style.display = 'none';
        }
        
    } catch (error) {
        console.error("Error crítico de Firebase:", error);
        alert('❌ Error de Permisos: Revisa que las Reglas de Firebase tengan el campo "nombre" y no "cliente".');
    }
}


    // =========================================================
    // 8. FUNCIONES DE UTILIDAD Y CERRAR MODALES
    // =========================================================

    function showSuccessAnimation(total) {
        if (window.confetti) {
             confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#D35400', '#F39C12', '#27AE60'] 
            });
        }
    }
    
    function sendWhatsappConfirmation(nombre, total, platos) {
        const telefonoRestaurante = '573227086610'; 
        let mensaje = `*✅ NUEVA ORDEN RECIBIDA* \n`;
mensaje += `*Restaurante:* La Cocina de la Abuela\n`;
mensaje += `--------------------------\n`;
mensaje += `*Cliente:* ${nombre}\n`;
mensaje += `*Pedido:* \n`;
platos.forEach(item => {
    mensaje += `• ${item.cantidad}x ${item.nombre}\n`;
});
mensaje += `--------------------------\n`;
mensaje += `*TOTAL A PAGAR:* $${total.toLocaleString('es-CO')}\n`;
mensaje += `\n*Estado:* Pendiente de confirmación.`;
        
        platos.forEach(item => {
            mensaje += `  - ${item.cantidad}x ${item.nombre}\\n`;
        });
        
        mensaje += `\\n*Por favor, revisa el Dashboard Admin para el detalle de la reserva y confirma con el cliente.*`;
        
        const encodedMessage = encodeURIComponent(mensaje);
        const whatsappUrl = `https://wa.me/${telefonoRestaurante}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    }
    
    // Cierre de Modales por botón
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modalId; 
            document.getElementById(modalId).style.display = 'none';
        });
    });

    // Cierre de Modales por clic fuera
    window.onclick = function(event) {
        if (event.target == dataModal) dataModal.style.display = 'none';
        if (event.target == loginModal) loginModal.style.display = 'none';
        if (event.target == detailModal) detailModal.style.display = 'none'; 
    }

    // ⭐ Inicialización
    cargarMenu();
    actualizarCarritoDOM();
});
