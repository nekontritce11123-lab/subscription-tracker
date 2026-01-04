import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FinancialHorizon } from './components/FinancialHorizon';
import { SubscriptionGridCard, EmptyState, AddForm, getPaymentStatus } from './components/SubscriptionList';
import { PaymentContent } from './components/PaymentContent';
import { Button, Toast, BottomSheet } from './components/UI';
import { useSubscriptions, useTelegram, setApiInitData } from './hooks';
import { getOverdueDays, isDueToday as checkIsDueToday } from './hooks/useStats';
import { Subscription } from './types/subscription';
import styles from './App.module.css';

interface DeletedItem {
  subscription: Subscription;
  index: number;
}

function App() {
  const { t } = useTranslation();
  const { isReady, hapticFeedback, getInitData } = useTelegram();
  const { subscriptions, isLoaded, addSubscription, updateSubscription, removeSubscription, restoreSubscription, getSubscription } =
    useSubscriptions();

  // Initialize API client with Telegram initData - MUST run before useSubscriptions init
  // This is called synchronously on first render to beat the async init
  const initData = getInitData();
  if (initData) {
    setApiInitData(initData);
  }

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [paymentSubscription, setPaymentSubscription] = useState<Subscription | null>(null);
  const [deletedItem, setDeletedItem] = useState<DeletedItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Subscription | null>(null);
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null);

  // Handle deep link from notification (?subscription=<id>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get('subscription');
    if (subscriptionId) {
      setDeepLinkId(subscriptionId);
      // Clear URL params to prevent reopening on refresh
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Open payment sheet when deep link subscription is loaded
  useEffect(() => {
    if (deepLinkId && isLoaded && subscriptions.length > 0) {
      const subscription = getSubscription(deepLinkId);
      if (subscription) {
        setPaymentSubscription(subscription);
        setDeepLinkId(null);
      }
    }
  }, [deepLinkId, isLoaded, subscriptions, getSubscription]);

  const handleAddNew = (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    addSubscription(data);
    setShowAddSheet(false);
  };

  const handleUpdate = (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (editingSubscription) {
      updateSubscription(editingSubscription.id, data);
      setEditingSubscription(null);
    }
  };

  const handleCardTap = (subscription: Subscription) => {
    const status = getPaymentStatus(subscription);
    if (status === 'overdue' || status === 'dueToday') {
      setPaymentSubscription(subscription);
    } else {
      setEditingSubscription(subscription);
    }
  };

  const handleCardLongPress = (subscription: Subscription) => {
    setShowDeleteConfirm(subscription);
  };

  const handleOpenAddSheet = () => {
    hapticFeedback.light();
    setAddFormKey(k => k + 1); // Reset form
    setShowAddSheet(true);
  };

  const handleCloseAddSheet = () => {
    setShowAddSheet(false);
  };

  const handleCloseEditSheet = () => {
    setEditingSubscription(null);
  };

  const handleClosePaymentSheet = () => {
    setPaymentSubscription(null);
  };

  const handlePaidOnDate = (date: Date) => {
    if (!paymentSubscription) return;
    // Если дата сегодня, не меняем billingDay
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      updateSubscription(paymentSubscription.id, {
        startDate: date.toISOString(),
      });
    } else {
      updateSubscription(paymentSubscription.id, {
        startDate: date.toISOString(),
        billingDay: date.getDate(),
      });
    }
    setPaymentSubscription(null);
  };

  const handleCancelSubscription = () => {
    if (!paymentSubscription) return;
    removeSubscription(paymentSubscription.id);
    setPaymentSubscription(null);
  };

  const handleConfirmDelete = () => {
    if (showDeleteConfirm) {
      const index = subscriptions.findIndex(s => s.id === showDeleteConfirm.id);
      setDeletedItem({ subscription: showDeleteConfirm, index });
      removeSubscription(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  const handleUndo = useCallback(() => {
    if (deletedItem) {
      restoreSubscription(deletedItem.subscription, deletedItem.index);
      setDeletedItem(null);
      hapticFeedback.success();
    }
  }, [deletedItem, restoreSubscription, hapticFeedback]);

  const handleCloseToast = useCallback(() => {
    setDeletedItem(null);
  }, []);

  if (!isReady || !isLoaded) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <FinancialHorizon subscriptions={subscriptions} />

      <main className={styles.main}>
        {subscriptions.length === 0 ? (
          <EmptyState onAdd={handleOpenAddSheet} />
        ) : (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>{t('grid.title')}</span>
            </div>
            <div className={styles.grid}>
              {subscriptions.map((subscription) => (
                <SubscriptionGridCard
                  key={subscription.id}
                  subscription={subscription}
                  onTap={() => handleCardTap(subscription)}
                  onLongPress={() => handleCardLongPress(subscription)}
                />
              ))}
            </div>
          </>
        )}

      </main>

      {/* Fixed bottom bar with add button */}
      <div className={styles.bottomBar}>
        <Button
          variant="primary"
          fullWidth
          onClick={handleOpenAddSheet}
        >
          + {t('form.add')}
        </Button>
      </div>

      {/* Add subscription bottom sheet */}
      <BottomSheet
        isOpen={showAddSheet}
        onClose={handleCloseAddSheet}
        title={t('form.add')}
      >
        <AddForm
          key={addFormKey}
          onAdd={handleAddNew}
          onCancel={handleCloseAddSheet}
        />
      </BottomSheet>

      {/* Edit subscription bottom sheet */}
      <BottomSheet
        isOpen={!!editingSubscription}
        onClose={handleCloseEditSheet}
        title={editingSubscription?.name}
      >
        {editingSubscription && (
          <AddForm
            onAdd={handleUpdate}
            onCancel={handleCloseEditSheet}
            editingSubscription={editingSubscription}
          />
        )}
      </BottomSheet>

      {/* Payment confirmation bottom sheet */}
      <BottomSheet
        isOpen={!!paymentSubscription}
        onClose={handleClosePaymentSheet}
      >
        {paymentSubscription && (
          <PaymentContent
            subscription={paymentSubscription}
            overdueDays={getOverdueDays(paymentSubscription.billingDay)}
            isDueToday={checkIsDueToday(paymentSubscription.billingDay, paymentSubscription.startDate)}
            onPaidOnDate={handlePaidOnDate}
            onCancel={handleCancelSubscription}
          />
        )}
      </BottomSheet>

      {/* Delete confirmation bottom sheet */}
      <BottomSheet
        isOpen={!!showDeleteConfirm}
        onClose={handleCancelDelete}
        title={t('confirm.delete')}
      >
        <p className={styles.deleteMessage}>
          {t('confirm.deleteDesc')}
        </p>
        <div className={styles.deleteActions}>
          <Button variant="ghost" fullWidth onClick={handleCancelDelete}>
            {t('confirm.no')}
          </Button>
          <Button variant="destructive" fullWidth onClick={handleConfirmDelete}>
            {t('confirm.yes')}
          </Button>
        </div>
      </BottomSheet>

      {deletedItem && (
        <Toast
          message={t('confirm.deleted', { name: deletedItem.subscription.name })}
          action={{
            label: t('confirm.undo'),
            onClick: handleUndo,
          }}
          onClose={handleCloseToast}
        />
      )}
    </div>
  );
}

export default App;
