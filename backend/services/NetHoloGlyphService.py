import asyncio
import logging
from typing import Dict, Any, Optional

from google.protobuf.timestamp_pb2 import Timestamp
# Assuming definitions_pb2 will be generated from your .proto files
# For now, this import will likely fail if the file doesn't exist yet.
# Create a dummy nethologlyph/generated_pb2/definitions_pb2.py if needed for pylint/type-checking during dev.
try:
    from nethologlyph.generated_pb2 import definitions_pb2 as nethologlyph_pb2
    # Also import specific message types if needed directly, e.g.:
    # from nethologlyph.generated_pb2.definitions_pb2 import HolographicSymbol, GestureChunk 
except ImportError:
    logging.warning("NetHoloGlyph protobuf definitions (definitions_pb2.py) not found. Service will not function correctly.")
    # Define dummy classes if needed for the code to be parsable, or use Any type hints.
    class NetHoloPacket: # Dummy
        def __init__(self, *args, **kwargs): pass
        def ParseFromString(self, data): pass
        def SerializeToString(self): return b""
        # Add dummy fields that are accessed, e.g. payload, header
        payload = None 
        header = None
        
    nethologlyph_pb2 = type('dummy_pb2', (object,), {'NetHoloPacket': NetHoloPacket})


from backend.models.internal_bus_models import InternalMessage
# Import specific Pydantic models that correspond to your Protobuf message payloads
from backend.models.nethologlyph_models import (
    HolographicSymbolNetModel, # Pydantic version of HolographicSymbol proto
    GestureChunkNetModel,      # Pydantic version of GestureChunk proto
    TriaStateUpdateNetModel,   # Pydantic version of TriaStateUpdate proto
    # Add other Pydantic models corresponding to other NetHoloPacket payload types
)
from backend.models.hologram_models import ( # These might be what your internal messages use
    HolographicSymbolModel as InternalHolographicSymbol,
    # ThreeDEmojiModel, AudioVisualizationStateModel # etc.
)
from backend.models.gesture_models import (
    InterpretedGestureSequenceDB as InternalGestureSequence,
)

from backend.utils.protobuf_mapper import to_protobuf, from_protobuf, datetime_to_protobuf_timestamp, protobuf_timestamp_to_datetime
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NetHoloGlyphService:
    def __init__(self, coordination_service: Any): # coordination_service should be typed properly later
        """
        Initializes the NetHoloGlyphService.

        Args:
            coordination_service: An instance of the CoordinationService for internal message handling.
        """
        self.coordination_service = coordination_service
        self.connected_clients: Dict[str, Any] = {}  # Stores client_id: websocket_connection
        logger.info("NetHoloGlyphService initialized.")

    async def register_client(self, client_id: str, websocket: Any):
        """
        Registers a new client connection.

        Args:
            client_id: A unique identifier for the client.
            websocket: The WebSocket connection object for this client.
        """
        if client_id in self.connected_clients:
            logger.warning(f"Client {client_id} already registered. Overwriting existing connection.")
        self.connected_clients[client_id] = websocket
        logger.info(f"Client {client_id} registered and connected.")
        # Optionally, send a handshake response or initial state upon registration

    async def unregister_client(self, client_id: str):
        """
        Unregisters a client connection.

        Args:
            client_id: The identifier of the client to unregister.
        """
        if client_id in self.connected_clients:
            del self.connected_clients[client_id]
            logger.info(f"Client {client_id} unregistered and disconnected.")
        else:
            logger.warning(f"Attempted to unregister non-existent client: {client_id}")

    async def process_incoming_glyph(self, client_id: str, binary_data: bytes):
        """
        Processes an incoming binary NetHoloGlyph packet from a client.

        Args:
            client_id: The ID of the client sending the data.
            binary_data: The raw binary data of the NetHoloPacket.
        """
        if client_id not in self.connected_clients:
            logger.error(f"Received glyph from unknown or unregistered client: {client_id}. Discarding.")
            return

        try:
            proto_packet = nethologlyph_pb2.NetHoloPacket()
            proto_packet.ParseFromString(binary_data)
            logger.debug(f"Received NetHoloPacket from {client_id}. Packet ID: {proto_packet.header.packet_id}, Type: {proto_packet.WhichOneof('payload')}")

            pydantic_payload: Optional[Any] = None
            payload_type_str = proto_packet.WhichOneof('payload')

            # Convert Protobuf payload to the corresponding Pydantic model
            if payload_type_str == "holographic_symbol":
                pydantic_payload = from_protobuf(proto_packet.holographic_symbol, HolographicSymbolNetModel)
            elif payload_type_str == "gesture_chunk":
                pydantic_payload = from_protobuf(proto_packet.gesture_chunk, GestureChunkNetModel)
            elif payload_type_str == "tria_state_update": # Assuming TriaStateUpdate is a defined proto message
                pydantic_payload = from_protobuf(proto_packet.tria_state_update, TriaStateUpdateNetModel)
            # Add more elif blocks for other payload types defined in your .proto file
            # e.g., handshake_request, scene_update_request etc.
            else:
                logger.warning(f"Received NetHoloPacket with unknown or unhandled payload type: {payload_type_str} from {client_id}")
                return

            if pydantic_payload:
                # Create an InternalMessage to pass to the CoordinationService
                internal_message = InternalMessage(
                    source_service=f"NetHoloGlyphClient_{client_id}", # Identify the source
                    target_service=None, # CoordinationService will route it
                    event_type=f"nethologlyph_{payload_type_str}_received", # e.g., "nethologlyph_gesture_chunk_received"
                    payload=pydantic_payload.model_dump(), # Pydantic v2
                    # payload=pydantic_payload.dict(), # Pydantic v1
                    user_id=client_id, # Assuming client_id is the user_id for now
                    session_id=proto_packet.header.session_id if proto_packet.header.HasField("session_id") else None, # If session_id is in header
                    correlation_id=proto_packet.header.packet_id # Use packet_id for correlation
                )
                logger.debug(f"Dispatching InternalMessage for {payload_type_str} from {client_id} to CoordinationService.")
                await self.coordination_service.handle_internal_message(internal_message)
            else:
                logger.warning(f"Payload conversion failed for type {payload_type_str} from {client_id}.")

        except Exception as e:
            logger.error(f"Error processing incoming glyph from {client_id}: {e}", exc_info=True)
            # Optionally, send an error packet back to the client

    async def send_outgoing_glyph(self, internal_message: InternalMessage, target_client_id: Optional[str] = None):
        """
        Converts an InternalMessage to a NetHoloGlyph packet and sends it to clients.

        Args:
            internal_message: The InternalMessage to send.
            target_client_id: If specified, sends only to this client. Otherwise, broadcasts.
        """
        try:
            proto_packet = nethologlyph_pb2.NetHoloPacket()
            
            # Populate header
            proto_packet.header.packet_id = str(internal_message.message_id) # Assuming message_id is UUID
            proto_packet.header.timestamp.FromDatetime(internal_message.timestamp.replace(tzinfo=timezone.utc)) # Ensure datetime is offset-aware
            proto_packet.header.source_id = internal_message.source_service # e.g., "TriaSystem" or specific bot
            if target_client_id:
                 proto_packet.header.target_id = target_client_id
            # proto_packet.header.version = "0.1.0" # Set your protocol version

            # Determine payload type from internal_message.event_type or payload structure
            # This mapping needs to be robust.
            # Example: if internal_message.event_type suggests a HolographicSymbol update
            
            payload_data = internal_message.payload
            pydantic_model_instance: Optional[Any] = None
            proto_payload_instance: Optional[Any] = None
            oneof_field_name: Optional[str] = None

            # Example mapping from internal event_type or payload model type to Protobuf oneof field
            if internal_message.event_type == "holographic_symbol_update":
                # Assume payload_data is a dict that can be parsed by InternalHolographicSymbol
                pydantic_model_instance = InternalHolographicSymbol(**payload_data)
                proto_payload_instance = to_protobuf(pydantic_model_instance, nethologlyph_pb2.HolographicSymbol)
                oneof_field_name = "holographic_symbol"
            elif internal_message.event_type == "tria_state_update_external":
                # Assume payload_data is a dict for TriaStateUpdateNetModel
                pydantic_model_instance = TriaStateUpdateNetModel(**payload_data) # Or your internal Pydantic model for Tria state
                proto_payload_instance = to_protobuf(pydantic_model_instance, nethologlyph_pb2.TriaStateUpdate)
                oneof_field_name = "tria_state_update"
            # Add more elif blocks for other InternalMessage types and their corresponding Protobuf payloads
            # e.g., gesture recognition results from Tria to be sent to client
            elif internal_message.event_type == "gesture_sequence_processed":
                pydantic_model_instance = InternalGestureSequence(**payload_data)
                # We need a GestureChunkNetModel to send over network.
                # This implies a conversion from InternalGestureSequence to GestureChunkNetModel or directly to proto.
                # For simplicity, let's assume a direct mapping for now, or that payload is already GestureChunkNetModel compatible.
                # If InternalGestureSequence maps directly to proto_packet.gesture_chunk fields:
                proto_payload_instance = to_protobuf(pydantic_model_instance, nethologlyph_pb2.GestureChunk)
                oneof_field_name = "gesture_chunk"

            else:
                logger.warning(f"No Protobuf mapping for InternalMessage event_type: {internal_message.event_type}. Cannot send.")
                return

            if proto_payload_instance and oneof_field_name:
                getattr(proto_packet, oneof_field_name).CopyFrom(proto_payload_instance)
            else:
                logger.error(f"Failed to create or assign Protobuf payload for event_type: {internal_message.event_type}")
                return

            binary_data_to_send = proto_packet.SerializeToString()

            if target_client_id:
                if target_client_id in self.connected_clients:
                    websocket = self.connected_clients[target_client_id]
                    await websocket.send_bytes(binary_data_to_send) # Assuming FastAPI WebSocket or similar
                    logger.debug(f"Sent NetHoloPacket (type: {oneof_field_name}) to client {target_client_id}. Packet ID: {proto_packet.header.packet_id}")
                else:
                    logger.warning(f"Target client {target_client_id} not found for outgoing glyph.")
            else: # Broadcast to all connected clients
                if not self.connected_clients:
                    logger.info("No clients connected to broadcast NetHoloPacket.")
                    return
                
                logger.info(f"Broadcasting NetHoloPacket (type: {oneof_field_name}) to {len(self.connected_clients)} clients. Packet ID: {proto_packet.header.packet_id}")
                # Use asyncio.gather for concurrent sending if websockets are truly independent
                # For simplicity, iterating here.
                for client_id, websocket in self.connected_clients.items():
                    try:
                        await websocket.send_bytes(binary_data_to_send)
                        logger.debug(f"Broadcasted NetHoloPacket to client {client_id}.")
                    except Exception as e_send:
                        logger.error(f"Error sending broadcast to client {client_id}: {e_send}. Removing client.")
                        # Consider unregistering client on send error after retries or based on error type
                        # await self.unregister_client(client_id) # Be careful with modifying dict during iteration

        except Exception as e:
            logger.error(f"Error preparing or sending outgoing glyph: {e}", exc_info=True)

# Example instantiation (typically done in main application setup)
# async def main():
#     class MockCoordinationService:
#         async def handle_internal_message(self, message: InternalMessage):
#             print(f"MockCoordinationService received: {message.event_type} with payload {message.payload}")
#             # Simulate Tria processing and sending a response
#             if message.event_type == "nethologlyph_gesture_chunk_received":
#                 response_payload_dict = {"status": "Gesture Acknowledged", "gesture_id": message.payload.get("gesture_id")}
#                 response_internal_msg = InternalMessage(
#                     source_service="TriaSystem",
#                     event_type="tria_state_update_external", # This should map to a proto message
#                     payload=response_payload_dict,
#                     user_id=message.user_id
#                 )
#                 # Simulate sending this back to the client via NetHoloGlyphService
#                 # In a real app, CoordinationService wouldn't call NetHoloGlyphService.send directly,
#                 # but might put it on an outgoing queue or return it for NetHoloGlyphService to pick up.
#                 # For this example, let's assume NetHoloGlyphService is accessible for direct call.
#                 if hasattr(main, 'nethologlyph_service_instance'): # Check if instance exists
#                     await main.nethologlyph_service_instance.send_outgoing_glyph(response_internal_msg, target_client_id=message.user_id)


#     coord_service = MockCoordinationService()
#     main.nethologlyph_service_instance = NetHoloGlyphService(coordination_service=coord_service)
    
    # Simulate a client connecting
    # class MockWebSocket:
    #     async def send_bytes(self, data): print(f"MockWebSocket: Sending {len(data)} bytes.")
    #     async def receive_bytes(self): await asyncio.sleep(1); return b"simulated_data" # Placeholder

    # client1_ws = MockWebSocket()
    # await main.nethologlyph_service_instance.register_client("user123", client1_ws)

    # Simulate receiving a gesture chunk from client1_ws
    # This would typically happen in a WebSocket handling loop
    # gesture_proto = nethologlyph_pb2.GestureChunk(gesture_id="gesture_abc", user_id="user123", source_modality="test_client")
    # packet_proto = nethologlyph_pb2.NetHoloPacket(
    #     header=nethologlyph_pb2.NetHoloPacket.Header(packet_id="pkt1", source_id="user123"),
    #     gesture_chunk=gesture_proto
    # )
    # binary_gesture_packet = packet_proto.SerializeToString()
    # await main.nethologlyph_service_instance.process_incoming_glyph("user123", binary_gesture_packet)

# if __name__ == "__main__":
#     logging.basicConfig(level=logging.DEBUG)
#     asyncio.run(main())
```
