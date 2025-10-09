import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Paper,
    Typography,
    Alert,
    Snackbar,
    TextField,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import {
    TrendingDown,
    AccountBalance,
    Refresh,
} from '@mui/icons-material';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/cash-movements`;

const MovementManager = () => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingExpense, setLoadingExpense] = useState(false);
    const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
    const [expenseData, setExpenseData] = useState({
        amount: '',
        description: '',
        paymentMethod: 'EFECTIVO'
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const todayString = today.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD en zona horaria local
        return {
            startDate: todayString,
            endDate: todayString
        };
    });

    const fetchMovements = useCallback(async () => {
        try {
            setLoading(true);
            const { startDate, endDate } = dateRange;
            const response = await fetch(`${API_URL}/by-date?startDate=${startDate}&endDate=${endDate}`);
            if (!response.ok) {
                throw new Error('Error al obtener los movimientos');
            }
            const data = await response.json();
            setMovements(data || []);
        } catch (error) {
            console.error('Error:', error);
            setSnackbar({
                open: true,
                message: 'Error al cargar los movimientos',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchMovements();
    }, [fetchMovements]);

    const handleCreateExpense = async () => {
        try {
            setLoadingExpense(true);
            const response = await fetch(`${API_URL}/expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...expenseData,
                    amount: parseFloat(expenseData.amount)
                })
            });

            if (!response.ok) {
                throw new Error('Error al crear el egreso');
            }

            setSnackbar({
                open: true,
                message: 'Egreso registrado exitosamente',
                severity: 'success'
            });

            setOpenExpenseDialog(false);
            setExpenseData({ amount: '', description: '', paymentMethod: 'EFECTIVO' });
            fetchMovements();
        } catch (error) {
            console.error('Error:', error);
            setSnackbar({
                open: true,
                message: 'Error al registrar el egreso',
                severity: 'error'
            });
        } finally {
            setLoadingExpense(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(amount);
    };

    const getMovementTypeColor = (type) => {
        switch (type) {
            case 'INCOME':
                return 'success';
            case 'EXPENSE':
                return 'error';
            case 'OPENING':
                return 'info';
            case 'CLOSING':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getMovementTypeLabel = (type) => {
        switch (type) {
            case 'INCOME':
                return 'Ingreso';
            case 'EXPENSE':
                return 'Egreso';
            case 'OPENING':
                return 'Apertura';
            case 'CLOSING':
                return 'Cierre';
            default:
                return type;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalance />
                                Gestión de Movimientos de Caja
                            </Typography>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<TrendingDown />}
                                onClick={() => setOpenExpenseDialog(true)}
                            >
                                Registrar Egreso
                            </Button>
                        </Box>

                        {/* Filtros de fecha */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <TextField
                                label="Fecha Inicio"
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="Fecha Fin"
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchMovements}
                            >
                                Actualizar
                            </Button>
                        </Box>

                        {/* Tabla de movimientos */}
                        <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                            <Table sx={{ minWidth: 650 }}>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '0.95rem',
                                            padding: '16px 24px',
                                            width: '20%'
                                        }}>Fecha y Hora</TableCell>
                                        <TableCell sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '0.95rem',
                                            padding: '16px 16px',
                                            width: '15%'
                                        }}>Tipo</TableCell>
                                        <TableCell sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '0.95rem',
                                            padding: '16px 16px',
                                            width: '35%'
                                        }}>Descripción</TableCell>
                                        <TableCell align="right" sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '0.95rem',
                                            padding: '16px 16px',
                                            width: '15%'
                                        }}>Monto</TableCell>
                                        <TableCell sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '0.95rem',
                                            padding: '16px 24px',
                                            width: '15%'
                                        }}>Método de Pago</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Cargando movimientos...
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : movements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No hay movimientos en el rango de fechas seleccionado
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        movements.map((movement, index) => (
                                            <TableRow 
                                                key={movement.cashMovementId}
                                                sx={{ 
                                                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                            >
                                                <TableCell sx={{ 
                                                    fontSize: '0.9rem', 
                                                    color: '#666',
                                                    padding: '12px 24px'
                                                }}>
                                                    {new Date(movement.date).toLocaleString('es-CO', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell sx={{ padding: '12px 16px' }}>
                                                    <Chip
                                                        label={getMovementTypeLabel(movement.type)}
                                                        color={getMovementTypeColor(movement.type)}
                                                        size="small"
                                                        sx={{ fontWeight: 'medium' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ 
                                                    fontSize: '0.9rem',
                                                    padding: '12px 16px',
                                                    maxWidth: '250px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {movement.description}
                                                </TableCell>
                                                <TableCell align="right" sx={{ 
                                                    fontSize: '0.95rem', 
                                                    fontWeight: 'medium',
                                                    color: movement.type === 'EGRESO' ? '#d32f2f' : '#2e7d32',
                                                    padding: '12px 16px'
                                                }}>
                                                    {movement.type === 'EGRESO' ? '-' : '+'}{formatCurrency(Math.abs(movement.amount))}
                                                </TableCell>
                                                <TableCell sx={{ 
                                                    fontSize: '0.9rem',
                                                    padding: '12px 24px'
                                                }}>
                                                    <Chip 
                                                        label={movement.paymentMethod || 'N/A'} 
                                                        variant="outlined" 
                                                        size="small"
                                                        sx={{ fontSize: '0.75rem' }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Grid>
            </Grid>

            {/* Modal para registrar egreso */}
            <Dialog open={openExpenseDialog} onClose={() => setOpenExpenseDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingDown color="error" />
                        Registrar Egreso
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Monto"
                            type="number"
                            value={expenseData.amount}
                            onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
                            fullWidth
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                        />
                        <TextField
                            label="Descripción"
                            value={expenseData.description}
                            onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                            fullWidth
                            required
                            multiline
                            rows={3}
                        />
                        <FormControl fullWidth required>
                            <InputLabel>Método de Pago</InputLabel>
                            <Select
                                value={expenseData.paymentMethod}
                                label="Método de Pago"
                                onChange={(e) => setExpenseData({ ...expenseData, paymentMethod: e.target.value })}
                            >
                                <MenuItem value="EFECTIVO">Efectivo</MenuItem>
                                <MenuItem value="TARJETA">Tarjeta</MenuItem>
                                <MenuItem value="TRANSFERENCIA">Transferencia</MenuItem>
                                <MenuItem value="OTRO">Otro</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setOpenExpenseDialog(false)}
                        disabled={loadingExpense}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreateExpense}
                        variant="contained"
                        color="error"
                        disabled={!expenseData.amount || !expenseData.description || !expenseData.paymentMethod || loadingExpense}
                        startIcon={loadingExpense ? <CircularProgress size={20} color="inherit" /> : <TrendingDown />}
                    >
                        {loadingExpense ? 'Registrando...' : 'Registrar Egreso'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar para notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MovementManager;