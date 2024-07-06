import { Button, Modal, message, Input, Card, Typography, Space, Divider, Select, Row, Col, Statistic, DatePicker, Table, Tag } from "antd";
import { useState, useEffect } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import moment from "moment";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const BoostifySDK = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const aptosConfig = new AptosConfig({ network: Network.RANDOMNET, faucet: "https://faucet.random.aptoslabs.com" });
  const aptos = new Aptos(aptosConfig); // default to devnet
  const { account, signAndSubmitTransaction } = useWallet();

  interface RewardObj {
    reward_active: boolean;
    reward_winners: string[];
  }

  const [ownerAddresses, setOwnerAddresses] = useState<string[]>([]);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [numRewards, setNumRewards] = useState<number>(1);
  const [funcName, setFuncName] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [contractAddresses, setContractAddresses] = useState<string[]>([]);
  const [selectedContractAddress, setSelectedContractAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment]>([moment(), moment()]);

  interface CoinActivity {
    event_account_address: string;
    entry_function_id_str: string;
  }

  interface QueryResult {
    data: {
      coin_activities: CoinActivity[];
      account_transactions: CoinActivity[];
    };
    errors?: string;
  }

  const [rewardState, setRewardState] = useState<RewardObj>({
    reward_active: false,
    reward_winners: [],
  });

  useEffect(() => {
    const checkAdmin = async () => {
      if (account?.address && selectedContractAddress) {
        const adminAddress = selectedContractAddress;
        setIsAdmin(account.address === adminAddress);
      }
    };
    checkAdmin();
  }, [account, selectedContractAddress]);

  const fetchMyQuery = async (): Promise<QueryResult> => {
    const [startDate, endDate] = dateRange;
    const operation = `
      query MyQuery {
        coin_activities(
          where: {
            entry_function_id_str: {_eq: "${funcName}"},
            transaction_timestamp: {_lte: "${endDate.format('YYYY-MM-DDTHH:mm:ss')}", _gte: "${startDate.format('YYYY-MM-DDTHH:mm:ss')}"}
          }
          distinct_on: event_account_address
        ) {
          event_account_address
          coin_type
          entry_function_id_str
          transaction_timestamp
        }
      }
    `;
    const response = await fetch('https://api.random.aptoslabs.com/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: operation }),
    });
    return response.json();
  };

  const isValidAddress = (address: string): boolean => {
    const regex = /^0x[a-fA-F0-9]{1,64}$/;
    return regex.test(address);
  };

  const handleCollectOwnerAddresses = async () => {
    try {
      setLoading(true);
      const { data, errors } = await fetchMyQuery();
      if (errors) {
        console.error(errors);
        message.error("Failed to collect owner addresses.");
        return;
      }
      const addresses = data.coin_activities.map(
        (activity: CoinActivity) => activity.event_account_address
      );
      setOwnerAddresses(addresses);
      console.log(addresses);
      message.success("Owner addresses collected successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to collect owner addresses.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    try {
      setLoading(true);
      if (!selectedContractAddress) {
        message.error("Please select a contract address.");
        return;
      }
      const response = await signAndSubmitTransaction({
        type_arguments: [],
        function: `${selectedContractAddress}::VarRandomRewardSystem::add_wallet`,
        type: "entry_function_payload",
        arguments: [],
      });
      console.log(response);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      message.success("Wallet added successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to add wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRewardGroup = async () => {
    try {
      setLoading(true);
      if (!selectedContractAddress) {
        message.error("Please select a contract address.");
        return;
      }
      const response = await signAndSubmitTransaction({
        type_arguments: [],
        function: `${selectedContractAddress}::VarRandomRewardSystem::start_reward_group`,
        type: "entry_function_payload",
        arguments: [ownerAddresses],
      });
      console.log(response);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      message.success("Reward group started successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to start reward group.");
    } finally {
      setLoading(false);
    }
  };

  const handleEndReward = async () => {
    try {
      setLoading(true);
      if (!selectedContractAddress) {
        message.error("Please select a contract address.");
        return;
      }
      const response = await signAndSubmitTransaction({
        type_arguments: [],
        function: `${selectedContractAddress}::VarRandomRewardSystem::end_reward_groupA`,
        type: "entry_function_payload",
        arguments: [rewardAmount],
      });
      console.log(response);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      message.success("Reward ended successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to end reward.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetReward = async () => {
    try {
      setLoading(true);
      if (!selectedContractAddress) {
        message.error("Please select a contract address.");
        return;
      }
      const resource = await aptos.account.getAccountResource({
        accountAddress: selectedContractAddress,
        resourceType: `${selectedContractAddress}::VarRandomRewardSystem::RewardState`,
      });
      setRewardState(resource);
      message.success("Reward retrieved successfully!");
      console.log(resource);
    } catch (error) {
      console.error(error);
      message.error("Failed to get reward.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetReward = async () => {
    try {
      setLoading(true);
      if (!selectedContractAddress) {
        message.error("Please select a contract address.");
        return;
      }
      const response = await signAndSubmitTransaction({
        type_arguments: [],
        function: `${selectedContractAddress}::VarRandomRewardSystem::reset_reward`,
        type: "entry_function_payload",
        arguments: [],
      });
      console.log(response);
      await aptos.waitForTransaction({ transactionHash: response.hash });
      message.success("Reward reset successfully!");
    } catch (error) {
      console.error(error);
      message.error("Failed to reset reward.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContractAddress = () => {
    if (contractAddress && isValidAddress(contractAddress)) {
      setContractAddresses([...contractAddresses, contractAddress]);
      setSelectedContractAddress(contractAddress);
      setContractAddress("");
    } else {
      message.error("Invalid contract address. Please enter a valid Aptos account address.");
    }
  };

  const columns = [
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>{status ? 'Active' : 'Inactive'}</Tag>
      ),
    },
  ];

  const data = ownerAddresses.map((address, index) => ({
    key: index,
    address,
    status: rewardState.reward_winners.includes(address),
  }));

  return (
    <div style={{ padding: "24px" }}>
      <Card title="Contract Addresses" style={{ marginBottom: "24px" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Enter contract address"
          />
          <Button type="primary" onClick={handleAddContractAddress}>
            Add Contract Address
          </Button>
        </Space>
        <Divider />
        <Select
          value={selectedContractAddress}
          onChange={(value) => setSelectedContractAddress(value)}
          style={{ width: "100%" }}
          placeholder="Select a contract address"
        >
          {contractAddresses.map((address) => (
            <Select.Option key={address} value={address}>
              {address}
            </Select.Option>
          ))}
        </Select>
      </Card>
      <Button type="primary" onClick={() => setIsModalVisible(true)}>
        BoostifySDK
      </Button>
      <Modal
        title="Reward System"
        visible={isModalVisible}
        width={800}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Cancel
          </Button>,
          isAdmin ? (
            <>
              <Button key="collect" type="primary" onClick={handleCollectOwnerAddresses} loading={loading}>
                Collect Participant Addresses
              </Button>
              <Button key="startGroup" type="primary" onClick={handleStartRewardGroup} loading={loading}>
                Start
              </Button>
              <Button key="end" type="primary" onClick={handleEndReward} loading={loading}>
                End
              </Button>
              <Button key="reset" type="primary" onClick={handleResetReward} loading={loading}>
                Reset
              </Button>
            </>
          ) : (
            <Button key="add" type="primary" onClick={handleAddWallet} loading={loading}>
              Add Wallet
            </Button>
          ),
        ]}
      >
        {isAdmin ? (
          <Card title="Admin Dashboard">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Reward Amount" value={rewardAmount} />
                <Input
                  type="number"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(Number(e.target.value))}
                  placeholder="Reward Amount"
                  style={{ marginTop: "16px" }}
                />
              </Col>
              <Col span={12}>
                <Statistic title="Number of Rewards" value={numRewards} />
                <Input
                  type="number"
                  value={numRewards}
                  onChange={(e) => setNumRewards(Number(e.target.value))}
                  placeholder="Number of Rewards"
                  style={{ marginTop: "16px" }}
                />
              </Col>
            </Row>
            <Divider />
            <RangePicker
              onChange={(dates) => setDateRange(dates as [moment.Moment, moment.Moment])}
              showTime
              format="YYYY-MM-DDTHH:mm:ss"
              style={{ marginBottom: "16px" }}
            />
            <Input
              value={funcName}
              onChange={(e) => setFuncName(e.target.value)}
              placeholder="Set Function Name"
              style={{ marginBottom: "16px" }}
            />
            <Divider />
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button type="primary" onClick={handleGetReward} loading={loading}>
                Get Winning Wallet
              </Button>
              {rewardState && (
                <>
                  <Divider />
                  <Text strong>Reward Active:</Text>
                  <Text>{rewardState.reward_active ? "Yes" : "No"}</Text>
                  {rewardState.reward_winners.length > 0 && (
                    <>
                      <Text strong>Winning Wallet:</Text>
                      <Text>{rewardState.reward_winners}</Text>
                    </>
                  )}
                </>
              )}
            </Space>
            <Divider />
            <Title level={4}>Participant Addresses</Title>
            <Table columns={columns} dataSource={data} />
          </Card>
        ) : (
          <Card title="User Dashboard">
            <Text>Add your wallet to participate in the reward system.</Text>
          </Card>
        )}
      </Modal>
    </div>
  );
};

export default BoostifySDK;