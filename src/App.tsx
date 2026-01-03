import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StatsSummary } from './components/Header';
import { SubscriptionCard, EmptyState, AddForm } from './components/SubscriptionList';
import { Button, Toast } from './components/UI';
import { useSubscriptions, useStats, useTelegram } from './hooks';
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
  const stats = useStats(subscriptions);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletedItem, setDeletedItem] = useState<DeletedItem | null>(null);

  const handleAddNew = (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    addSubscription(data);
    setShowAddForm(false);
  };

  const handleUpdate = (id: string, data: Omit<Subscription, 'id' | 'createdAt'>) => {
    updateSubscription(id, data);
    setEditingId(null);
  };

  const handleStartEdit = (id: string) => {
    setShowAddForm(false);
    setEditingId(id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleOpenForm = () => {
    hapticFeedback.light();
    setEditingId(null);
    setShowAddForm(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const handleDelete = useCallback((id: string) => {
    const index = subscriptions.findIndex(s => s.id === id);
    const subscription = subscriptions.find(s => s.id === id);

    if (subscription) {
      setDeletedItem({ subscription, index });
      removeSubscription(id);
    }
  }, [subscriptions, removeSubscription]);

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
      <StatsSummary stats={stats} />

      <main className={styles.main}>
        {subscriptions.length === 0 && !showAddForm ? (
          <EmptyState onAdd={handleOpenForm} />
        ) : (
          <div className={styles.list}>
            {subscriptions.map((subscription, index) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onEdit={(data) => handleUpdate(subscription.id, data)}
                onDelete={handleDelete}
                isEditing={editingId === subscription.id}
                onStartEdit={() => handleStartEdit(subscription.id)}
                onCancelEdit={handleCancelEdit}
                index={index}
              />
            ))}

            {showAddForm ? (
              <AddForm
                onAdd={handleAddNew}
                onCancel={handleCancelAdd}
              />
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleOpenForm}
                className={styles.addButton}
              >
                + {t('form.add')}
              </Button>
            )}
          </div>
        )}
      </main>

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
