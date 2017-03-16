import React, { Component } from 'react';
import { connect } from 'react-apollo';
import { hashHistory } from 'react-router';
import client from 'utils/api-client';
import gql from 'graphql-tag';
import moment from 'moment';
import BalancePanel from 'components/billing/balance-panel';
import PaymentInfoPanel from 'components/billing/payment-info-panel';
import UsagePanel from 'components/billing/usage-panel';
import AddCardForm from 'containers/billing/add-card-form';
import TransactionsList from 'components/billing/transactions-list';
import 'containers/billing/billing.scss';
import { setBandwidth, setStorage, setBalance } from 'redux/modules/transaction-group';

const transactionRangeQuery =
  gql`query usageTransactions($startDate: String!, $endDate: String!) {
      credits(startDate: $startDate, endDate: $endDate) {
        id,
        paid_amount,
        created,
        type
      }
      debits(startDate: $startDate, endDate: $endDate) {
        id,
        amount,
        storage,
        bandwidth,
        created,
        type
      },
    }`;

const mapQueriesToProps = () => {
  return {
    paymentProcessor: {
      query: gql`query {
        paymentProcessor {
          id,
          name,
          billingDate,
          defaultPaymentMethod {
            merchant,
            lastFour,
            id
          },
          error
        }
      }`
    },
    transactions: {
      query: gql`query {
        credits {
          id,
          paid_amount,
          created,
          type
        },
        debits {
          id,
          amount,
          created,
          type,
          bandwidth,
          storage
        }
      }`
    }
  }
};

const mapMutationsToProps = () => {
  return {
    removeCard: (paymentProcessorId, paymentMethodId) => {
      return {
        // TODO: maybe add `id,` to get query update?
        mutation: gql`
        mutation removePaymentMethod($paymentProcessorId: String!, $paymentMethodId: String!) {
          removePaymentMethod(paymentProcessorId: $paymentProcessorId, paymentMethodId: $paymentMethodId) {
            id,
            name,
            billingDate,
            defaultPaymentMethod {
              merchant,
              lastFour,
              id
            },
            error
          }
        }`,
        variables: {
          paymentProcessorId,
          paymentMethodId
        }
      };
    }
  };
};

const mapDispatchToProps = {
  setStorage,
  setBandwidth,
  setBalance
};

const mapStateToProps = ({transactionGroup: {storage, bandwidth}}) => {
  return {storage, bandwidth};
};

let globalCounter = 0;

@connect({
  mapQueriesToProps,
  mapMutationsToProps,
  mapDispatchToProps,
  mapStateToProps
})

export default class Billing extends Component {
  constructor(props) {
    super(props);
    this.state = {
      removingCard: false
    };
  };

  componentWillMount() {
    const props = this.props;
    const privkey = window.localStorage.getItem('privkey');
    if (privkey) {
      client.api.getPublicKeys()
        .then(function success() {
          // NB: Makes sure that Apollo queries are properly refetched
          // Use this method for any data that needs to be forced to refetch
          // on container/component load
          props.paymentProcessor.refetch();
          props.transactions.refetch();
          return true;
        }, function fail(err) {
          console.log('publickey result', err);
          hashHistory.push('/');
        });
    } else {
      hashHistory.push('/');
    }
  }

  componentWillReceiveProps(nextProps) {
    globalCounter++;
    if (globalCounter > 50) return;

    const {bandwidth, storage, balance} = nextProps;

    if (!!bandwidth && !!storage) {
      return;
    }

    const { startDate, endDate } = this.getRange();

    if (!(storage && storage.loading)) {
      const storagePromise = this.props.query({
        query: transactionRangeQuery,
        variables: {
          startDate,
          endDate
        }
      });

      storagePromise.then(({data: {credits, debits}, loading}) => {
        const storage = this.getSum(debits, 'storage');
        this.props.setStorage(storage);
      });
    }

    if (!(balance && balance.loading)) {
      const balancePromise = this.props.query({
        query: transactionRangeQuery,
        variables: {
          startDate,
          endDate
        }
      });

      balancePromise.then(({data: {credits, debits}, loading}) => {
        const balance = this.getBalance(credits, debits);
        this.props.setBalance(balance);
      });
    }

    if (!(bandwidth && bandwidth.loading)) {
      const bandwidthPromise = this.props.query({
        query: transactionRangeQuery,
        variables: {
          startDate,
          endDate
        }
      });

      bandwidthPromise.then(({data: {credits, debits}}) => {
        const bandwidth = this.getSum(debits, 'bandwidth');
        this.props.setBandwidth(bandwidth);
      });
    }
  }

  getRange(offset=1) {
    const {loading, paymentProcessor} = this.props.paymentProcessor;
    const billingDate = (loading || !paymentProcessor) ?
      (new Date).getDate() : paymentProcessor.billingDate;

    const format = 'YYYY-MM-DD HH:mm:ss.SSS';
    const today = new Date();
    const currentYearMonth = [
      today.getUTCFullYear(),
      // plus 1 for 0 index to 1 index conversion; minus 1 for constant previous month
      today.getUTCMonth() // + 1 - 1
    ];

    const dateThisMonthString = (date) => {
      return `${currentYearMonth.concat([date]).join('-')} 00:00:00.000`
    };

    const daysInMonth = moment.utc(
      dateThisMonthString(1), format
    )
      .subtract(offset, 'month')
      .add(1, 'month')
      .subtract(1, 'day')
      .date();

    const startDayOfMonth = (billingDate > daysInMonth) ? daysInMonth : billingDate;
    const startDate = moment.utc(
      dateThisMonthString(startDayOfMonth), format
    ).subtract(offset, 'month').valueOf();

    const endDate = (moment(startDate).add('1', 'month').valueOf());

    return {
      startDate,
      endDate
    };
  }

  getBalance(credits, debits) {
    const debitSum = this.getSum(debits, 'amount');
    const promoCreditSum = this.getSum(credits, 'promo_amount');
    const paidCreditSum = this.getSum(credits, 'paid_amount');
    const creditSum = paidCreditSum + promoCreditSum;
    const balance = debitSum - creditSum;
    return balance;
  }

  getSum(arr, field) {
    return arr.reduce((acc, i) => {
      const add = typeof i[field] === 'undefined' ? 0 : i[field];
      return acc + add;
    }, 0)
  }

  getPaymentInfo() {
    const { loading, paymentProcessor } = this.props.paymentProcessor;

    if (loading || !paymentProcessor) {
      return {};
    }

    return paymentProcessor.defaultPaymentMethod || {};
  }

  getTransactions() {
    const {loading, credits, debits} = this.props.transactions;
    let transactions;

    if (loading || !credits || !debits) {
      return [];
    }

    const convertedCredits = credits.map((credit) => {
      const transaction = {...credit};
      transaction.amount = -credit.paid_amount;
      const titleizedType = credit.type
        .replace(/^\w/, (w) => (w.toUpperCase()));
      transaction.description = `${titleizedType} payment - Thank you!`;
      transaction.timestamp = moment.utc(credit.created).valueOf();
      transaction.created = `${moment.utc((credit.created))
        .format('MMM DD, YYYY - HH:mm')} UTC`;
      return transaction;
    });

    const convertedDebits = debits.map((debit) => {
      const GB = 1000000000; // NB: 9 zeros is 1 GB in bytes
      let amountUsed;

      /**
       * This check is here to control for any 'adjustment' types
       * Converts bytes to gigabytes
       */
      if (debit.type === 'storage' || debit.type === 'bandwidth') {
        const amountInGB = debit[debit.type] / GB;
        amountUsed = roundedAmount(amountInGB);
      }
      /**
       * Prettifies the amount printed in billing history.
       * Returns either a string that lets the user know that the amount that
       * has been used is than 0.01 GB or rounds the amount to two decimal
       * places.
       */
      function roundedAmount(num) {
        const roundedToTwoPlaces = Math.round(num * 100) / 100;
        const setToTwoDecimalPlaces = roundedToTwoPlaces.toFixed(2);

        // Checks to see if the amount is less than one cent
        if (setToTwoDecimalPlaces.indexOf('0.00') === 0) {
          const lessThanOneCent = '< 0.01 GB';
          return lessThanOneCent;
        }
        return `${setToTwoDecimalPlaces} GB`;
      }

      const transaction = {...debit};

      transaction.description =
        amountUsed
        ? `${amountUsed} of ${debit.type} used`
        : `Adjustment of ${debit.amount}`;
      transaction.timestamp = Date.parse(debit.created);
      transaction.created = `${moment.utc((debit.created))
        .format('MMM DD, YYYY - HH:mm')} UTC`;

      return transaction;
    });

    transactions = [...convertedCredits, ...convertedDebits];

    return transactions.sort((t1, t2) => (t2.timestamp - t1.timestamp));
  }

  removeCard() {
    this.setState({ removingCard: true });

    const { removeCard } = this.props.mutations;
    // TODO: use apollo watchquery correctly so we don't have to call `refetch`
    const {
      refetch,
      paymentProcessor: {
        id: paymentProcessorId,
        defaultPaymentMethod: {
          id: paymentMethodId
        }
      }
    } = this.props.paymentProcessor;

    removeCard(paymentProcessorId, paymentMethodId)
      .then(() => {
        setTimeout(() => {
          refetch();
          this.setState({ removingCard: false });
        }, 2000);
      });
  }

  render() {
    const addCreditHandler = () => { };
    const linkParams = '/dashboard/billing/usage';
    const { loading, refetch } = this.props.paymentProcessor;

    return (
      <div>
        <section>
          <div className="container">
            <div className="row">
              <div className="col-xs-12">
                <h1 className="title pull-left">Billing</h1>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <div className="row">
              <div className="col-xs-12 col-sm-6">
                <BalancePanel
                  amount={this.props.balance}
                  addCreditHandler={addCreditHandler}
                  cardData={this.getPaymentInfo()}
                />
              </div>
              <div className="col-xs-12 col-sm-6">
                <UsagePanel
                  amount={this.props.usage}
                  linkParams={linkParams}
                  bandwidth={this.props.bandwidth}
                  storage={this.props.storage}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          {
            loading
            // NB: We can replace this with a loading indicator later
            ? <h4>Loading . . . </h4>
            : !this.getPaymentInfo().id
            // TODO: use apollo watchquery correctly so we don't have
            // to call `refetch`
              ? <AddCardForm updatePaymentInfo={refetch} />
              : <PaymentInfoPanel
                  removingCard={this.state.removingCard}
                  removeCardHandler={this.removeCard.bind(this)}
                  paymentInfo={this.getPaymentInfo()}
                />
          }
        </section>

        <section>
          <TransactionsList transactions={this.getTransactions()}/>
        </section>

      </div>
    );
  }
}
