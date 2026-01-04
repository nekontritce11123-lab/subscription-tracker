import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FinancialHorizon } from './components/FinancialHorizon';
import { SubscriptionGridCard, EmptyState, AddForm } from './components/SubscriptionList';
import { Button, Toast, BottomSheet } from './components/UI';
import { useSubscriptions, useTelegram } from './hooks';
import { Subscription } from './types/subscription';
import styles from './App.module.css';

interface DeletedItem {
  subscription: Subscription;
  index: number;
}

function App() {
  const { t } = useTranslation();
  const { isReady, hapticFeedback } = useTelegram();
  const { subscriptions, isLoaded, addSubscription, updateSubscription, removeSubscription, restoreSubscription } =
    useSubscriptions();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletedItem, setDeletedItem] = useState<DeletedItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Subscription | null>(null);

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
    setEditingSubscription(subscription);
  };

  const handleCardLongPress = (subscription: Subscription) => {
    setShowDeleteConfirm(subscription);
  };

  const handleOpenAddSheet = () => {
    hapticFeedback.light();
    setShowAddSheet(true);
  };

  const handleCloseAddSheet = () => {
    setShowAddSheet(false);
  };

  const handleCloseEditSheet = () => {
    setEditingSubscription(null);
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

        <Button
          variant="primary"
          fullWidth
          onClick={handleOpenAddSheet}
          className={styles.addButton}
        >
          + {t('form.add')}
        </Button>
      </main>

      {/* Add subscription bottom sheet */}
      <BottomSheet
        isOpen={showAddSheet}
        onClose={handleCloseAddSheet}
        title={t('form.add')}
      >
        <AddForm
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
